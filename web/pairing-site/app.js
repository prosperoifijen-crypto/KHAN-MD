const form = document.getElementById("pairForm");
const phoneInput = document.getElementById("phone");
const button = document.getElementById("pairButton");
const result = document.getElementById("result");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const phone = phoneInput.value.trim();

  if (!phone) {
    result.textContent = "⚠️ Enter your WhatsApp number first.";
    return;
  }

  button.disabled = true;
  button.textContent = "𖣔 CONNECTING...";
  result.textContent = "𓁹 Preparing your primordial connection...";

  try {
    const response = await fetch("/api/pair", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ phone })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Pairing request failed.");
    }

    result.innerHTML = `
      <strong>𖣔 PAIRING CODE</strong><br>
      ${data.code || "Code generated successfully."}
    `;
  } catch (error) {
    result.textContent = `⚠️ ${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "𖣔 PAIR NOW";
  }
});
