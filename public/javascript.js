function validateIP(ip) {
  const ipRegex =
    /^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}$/;
  return ipRegex.test(ip);
}

function runLookup(wan) {
  const ipInput = document.getElementById(`ipAddress-${wan}`).value.trim();
  const resultArea = document.getElementById(`result-${wan}`);
  const resultText = resultArea.querySelector(".result-text");
  const resultLogo = resultArea.querySelector(".result-logo");
  const resultImg = resultLogo.querySelector("img");
  const copyMessage = document.getElementById(`copyMessage-${wan}`);

  copyMessage.style.display = "none"; // Hide previous copy message

  // Validate IP
  if (!validateIP(ipInput)) {
    resultText.innerHTML = `<div class="text-center p-4 text-red-600 font-bold">Invalid IP Address!</div>`;
    resultLogo.classList.add("hidden");
    return;
  }

  // Clear previous results
  resultText.innerHTML = `<div class="text-center p-4">Looking up <b>${ipInput}</b>...</div>`;
  resultLogo.classList.add("hidden");

  // Fetch whois
  fetch("/whois", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip: ipInput }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Lookup failed");
      return response.json();
    })
    .then((data) => {
      const logo = data.logo || "generic_logo.png";
      const formattedOutput = data.output
        ? data.output.replace(/\n/g, "<br>")
        : "<i>No whois data available</i>";

      // Update text
      resultText.innerHTML = `
        <div class="w-full text-center p-2">
          <b>IP Address:</b> ${ipInput}<br><br>
          ${formattedOutput}
        </div>
      `;

      // Update logo
      resultImg.src = `/img/us_isp_logos/${logo}`;
      resultImg.alt = `${data.organization || "ISP Logo"}`;
      resultLogo.classList.remove("hidden");
    })
    .catch((error) => {
      resultText.innerHTML = `<div class="text-center p-4 text-red-600"><b>Error:</b> ${error.message}</div>`;
      resultLogo.classList.add("hidden");
    });
}

function clearForm(wan) {
  document.getElementById(`ipAddress-${wan}`).value = "";
  const resultArea = document.getElementById(`result-${wan}`);
  const resultText = resultArea.querySelector(".result-text");
  const resultLogo = resultArea.querySelector(".result-logo");
  const copyMessage = document.getElementById(`copyMessage-${wan}`);

  if (resultText) resultText.innerHTML = "";
  if (resultLogo) resultLogo.classList.add("hidden");
  if (copyMessage) copyMessage.style.display = "none";
}

function copyToClipboard(wan) {
  const resultText = document.getElementById(`result-${wan}`).innerText;
  const copyMessage = document.getElementById(`copyMessage-${wan}`);

  navigator.clipboard
    .writeText(resultText)
    .then(() => {
      copyMessage.style.display = "inline";
      setTimeout(() => {
        copyMessage.style.display = "none";
      }, 3000);
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
    });
}

// Event delegation for clear buttons
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("clear-input")) {
    const wan = e.target.dataset.wan;
    clearForm(wan);
  }
});

// Auto-focus the first input on page load
document.addEventListener("DOMContentLoaded", function () {
  const firstInput = document.getElementById("ipAddress-WAN1");
  if (firstInput) firstInput.focus();
});