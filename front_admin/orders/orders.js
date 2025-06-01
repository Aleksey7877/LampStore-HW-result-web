document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login/login.html";
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      localStorage.removeItem("token");
      window.location.href = "/login/login.html";
      return;
    }
  } catch (err) {
    console.error("Ошибка при проверке токена:", err);
    localStorage.removeItem("token");
    window.location.href = "/login/login.html";
    return;
  }
  const list = document.getElementById('orders-list');
  const searchInput = document.getElementById('search-input');
  let orders = [];

  document.getElementById('logout')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/login/login.html';
  });

  const renderOrders = (ordersToRender) => {
    list.innerHTML = '';

    ordersToRender.forEach(order => {
      const row = document.createElement('div');
      row.className = 'order-row';

      const colNumber = document.createElement('div');
      colNumber.className = 'order-cell';
      colNumber.textContent = order.number;

      const colDate = document.createElement('div');
      colDate.className = 'order-cell';
      colDate.textContent = new Date(order.date).toLocaleDateString();

      const colStatus = document.createElement('div');
      colStatus.className = 'order-cell';
      colStatus.textContent = order.status?.name || '';

      const colAction = document.createElement('div');
      colAction.className = 'order-cell';

      const detailsButton = document.createElement("button");
      detailsButton.textContent = "Подробно";
      detailsButton.className = "order-item-button";
      detailsButton.addEventListener("click", () => {
        window.location.href = `../orderInfo/index.html?orderId=${order.id}`;
      });

      colAction.appendChild(detailsButton);
      row.append(colNumber, colDate, colStatus, colAction);
      list.appendChild(row);
    });
  };

  try {
    const res = await fetch("http://localhost:8002/orders", {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      }
    });

    if (!res.ok) {
      alert("Ошибка загрузки заказов: " + res.status);
      return;
    }

    orders = await res.json();
    renderOrders(orders);
  } catch (error) {
    console.error("Ошибка сети:", error);
    alert("Не удалось получить список заказов");
  }

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const filtered = orders.filter(order => {
      const status = order.status?.name || '';
      return (
        order.number.toLowerCase().includes(query) ||
        status.toLowerCase().includes(query)
      );
    });
    renderOrders(filtered);
  });
});

