function validateIP(ip) {
  const ipRegex =
    /^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}$/;
  return ipRegex.test(ip);
}

function runLookup(wan) {
  const ipInput = document.getElementById(`ipAddress-${wan}`).value.trim();
  const resultArea = document.getElementById(`result-${wan}`);
  const copyMessage = document.getElementById(`copyMessage-${wan}`);

  copyMessage.style.display = "none"; // Hide previous copy message

  if (!validateIP(ipInput)) {
    resultArea.innerHTML = "<div class='text-center p-4'><b>Invalid IP Address!</b></div>";
    return;
  }

  fetch("/whois", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip: ipInput }),
  })
    .then((response) => response.json())
    .then((data) => {
      const logo = data.logo || "generic_logo.png";
      const formattedOutput = `
        <div class="result-container flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-gray-50 shadow">
          <div class="result-text flex-1">
            <b>IP Address: ${ipInput}</b><br><br>
            ${data.output.replace(/\n/g, "<br>")}
          </div>
          <div class="result-logo flex-shrink-0 max-w-[100px]">
            <img 
              src="/img/us_isp_logos/${logo}" 
              alt="ISP Logo" 
              class="max-h-20 max-w-full object-contain mt-2 md:mt-0" 
            />
          </div>
        </div>
      `;
      resultArea.innerHTML = formattedOutput;
    })
    .catch((error) => {
      resultArea.innerHTML = `<div class='text-center p-4'><b>Error:</b> ${error}</div>`;
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