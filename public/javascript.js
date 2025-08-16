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
    resultArea.innerHTML =
      "<div class='text-center text-red-600 font-semibold'>Invalid IP Address!</div>";
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
      const org = data.organization || "Unknown Organization";
      const details = data.output
        ? data.output.replace(/\n/g, "<br>")
        : "No additional details.";

      const formattedOutput = `
        <div class="space-y-4 text-left">
          <!-- IP Section -->
          <div>
            <p class="text-xs uppercase text-gray-500">IP Address</p>
            <p class="font-mono font-semibold text-lg">${ipInput}</p>
          </div>

          <!-- Organization Section -->
          <div>
            <p class="text-xs uppercase text-gray-500">Organization</p>
            <p class="font-mono">${org}</p>
            <div class="mt-1 text-sm text-gray-700 font-mono">${details}</div>
          </div>

          <!-- Logo Section -->
          <div class="flex justify-center">
            <img src="/img/us_isp_logos/${logo}" alt="ISP Logo" class="h-16 object-contain" />
          </div>
        </div>
      `;

      resultArea.innerHTML = formattedOutput;
    })
    .catch((error) => {
      resultArea.innerHTML = `<div class='text-center text-red-600'><b>Error:</b> ${error}</div>`;
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