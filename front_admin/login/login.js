document.addEventListener("DOMContentLoaded", () => {
  const loginInput = document.querySelector("input.img");
  const passwordInput = document.querySelector("input.img-2");
  const loginButton = document.querySelector(".img-3");

  loginButton.addEventListener("click", async () => {
    const username = loginInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      alert("Введите логин и пароль");
      return;
    }

    try {
      const response = await fetch("http://localhost:8003/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            username,
            password
        })
        });

        if (response.ok) {
        const data = await response.json(); 
        localStorage.setItem("token", data.access_token);
        window.location.href = "../allProducts/index.html";
        } else {
        const errorText = await response.text();
        console.error("Ошибка авторизации:", errorText);
        alert("Неверный логин или пароль");
        }
    } catch (error) {
      console.error("Ошибка при авторизации:", error);
      alert("Ошибка подключения к серверу");
    }
  });
});
