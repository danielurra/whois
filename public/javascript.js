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
    resultArea.innerHTML = "<div style='text-align:center'><b>Invalid IP Address!</b></div>";
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
        <div class="result-container">
          <div class="result-text">
            <b>IP Address: ${ipInput}</b><br><br>
            ${data.output.replace(/\n/g, "<br>")}
          </div>
          <div class="result-logo">
            <img src="/img/us_isp_logos/${logo}" alt="ISP Logo" />
          </div>
        </div>
      `;

      resultArea.innerHTML = formattedOutput;
    })
    .catch((error) => {
      resultArea.innerHTML = "<div style='text-align:center'><b>Error:</b> " + error + "</div>";
    });
}

// function runLookup(wan) {
//   const ipInput = document.getElementById(`ipAddress-${wan}`).value.trim();
//   const resultArea = document.getElementById(`result-${wan}`);
//   const copyMessage = document.getElementById(`copyMessage-${wan}`);

//   copyMessage.style.display = "none"; // Hide previous copy message

//   if (!validateIP(ipInput)) {
//     resultArea.innerHTML = "<div style='text-align:center'><b>Invalid IP Address!</b></div>";
//     return;
//   }

//   fetch("/whois", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ ip: ipInput }),
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       const ispName = data.output.trim().split("\n").pop(); // Last line is usually ISP
//       const logo = data.logo || "generic_logo.png";

//       const formattedOutput = `
//         <div style="text-align:center">
//           <b>IP Address: ${ipInput}</b><br><br>
//           ${data.output.replace(/\n/g, "<br>")}<br><br>
//           <img src="/img/us_isp_logos/${logo}" alt="ISP Logo" style="max-height:80px; margin-top:10px;" />
//         </div>
//       `;
//       resultArea.innerHTML = formattedOutput;
//     })
//     .catch((error) => {
//       resultArea.innerHTML = "<div style='text-align:center'><b>Error:</b> " + error + "</div>";
//     });
// }

function clearForm(wan) {
  document.getElementById(`ipAddress-${wan}`).value = "";
  document.getElementById(`result-${wan}`).innerHTML = "";
  document.getElementById(`copyMessage-${wan}`).style.display = "none";
}

function copyToClipboard(wan) {
  const resultText = document.getElementById(`result-${wan}`).innerText;
  const copyMessage = document.getElementById(`copyMessage-${wan}`);

  navigator.clipboard.writeText(resultText).then(() => {
    copyMessage.style.display = "inline";
    setTimeout(() => {
      copyMessage.style.display = "none";
    }, 3000);
  });
}
