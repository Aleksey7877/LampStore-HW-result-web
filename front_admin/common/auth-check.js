document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login/login.html";
    return;
  }

  fetch("http://localhost:8003/me", {
    headers: {
      "Authorization": "Bearer " + token
    }
  })
    .then(res => {
      if (!res.ok) {
        localStorage.removeItem("token");
        window.location.href = "/login/login.html";
        throw new Error("Unauthorized");
      }
      return res.json();
    })
    .then(data => {
      const usernameEl = document.getElementById("username");
      if (usernameEl) {
        usernameEl.textContent = data.name;
      }
    })
    .catch(() => {
      localStorage.removeItem("token");
      window.location.href = "/login/login.html";
    });
});
