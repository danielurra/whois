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
    resultText.innerHTML = "<div class='text-center p-4'><b>Invalid IP Address!</b></div>";
    resultLogo.classList.add("hidden");
    return;
  }

  // Fetch whois
  fetch("/whois", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip: ipInput }),
  })
    .then((response) => response.json())
    .then((data) => {
      const logo = data.logo || "generic_logo.png";

      // Update text
      resultText.innerHTML = `
        <div class="w-full text-center">
          <b>IP Address: ${ipInput}</b><br><br>
          ${data.output.replace(/\n/g, "<br>")}
        </div>
      `;

      // Update logo
      resultImg.src = `/img/us_isp_logos/${logo}`;
      resultLogo.classList.remove("hidden");
    })
    .catch((error) => {
      resultText.innerHTML = `<div class='text-center p-4'><b>Error:</b> ${error}</div>`;
      resultLogo.classList.add("hidden");
    });
}


function clearForm(wan) {
  document.getElementById(`ipAddress-${wan}`).value = "";
  document.getElementById(`result-${wan}`).innerHTML = "";
  document.getElementById(`copyMessage-${wan}`).style.display = "none";
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

// Event delegation for clear buttons (works with dynamically added elements)
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("clear-input")) {
    const wan = e.target.dataset.wan;
    clearForm(wan);
  }
});

// Optional: Auto-focus the first input on page load
document.addEventListener("DOMContentLoaded", function () {
  const firstInput = document.getElementById("ipAddress-WAN1");
  if (firstInput) firstInput.focus();
});
