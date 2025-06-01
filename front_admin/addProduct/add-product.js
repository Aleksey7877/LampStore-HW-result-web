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
	const root = document.querySelector('.frame .div');

	document.querySelector('.btn-products')?.addEventListener('click', () => {
		window.location.href = '../allProducts/index.html';
	});
	document.querySelector('.btn-orders')?.addEventListener('click', () => {
		window.location.href = '../orders/index.html';
	});

	const product = {
		name: '',
		description: '',
		cost: '',
		status: 'active',
		image_url: '',
		attributes: {
			power: '',
			color: ''
		}
	};

	const card = createEmptyCard(product);
	root.appendChild(card);
});

document.getElementById('logout')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = '/login/login.html';
});


function createEmptyCard(product) {
	const wrapper = document.createElement('div');
	wrapper.className = 'product-wrapper';

	const card = document.createElement('div');
	card.className = 'product-card';

	const left = document.createElement('div');
	left.className = 'card-column left-column';

	const nameInput = document.createElement('input');
	nameInput.className = 'product-name';
	nameInput.type = 'text';
	nameInput.placeholder = 'Название';
	nameInput.value = product.name;
	left.appendChild(nameInput);

	const priceLabel = document.createElement('div');
	priceLabel.className = 'field-label';
	priceLabel.textContent = 'Цена:';
	left.appendChild(priceLabel);

	const priceInput = document.createElement('input');
	priceInput.className = 'input-price';
	priceInput.type = 'number';
	priceInput.placeholder = '₽';
	priceInput.value = product.cost;
	left.appendChild(priceInput);

	const descLabel = document.createElement('div');
	descLabel.className = 'field-label field-label-wrap';
	descLabel.textContent = 'Описание:';
	left.appendChild(descLabel);

	const descInput = document.createElement('textarea');
	descInput.rows = 2;
	descInput.className = 'input-long';
	descInput.placeholder = 'Описание товара';
	descInput.value = product.description;
	left.appendChild(descInput);

	const attrWrapper = document.createElement('div');
	attrWrapper.className = 'attributes-wrapper';

	const powerRow = document.createElement('div');
	powerRow.className = 'attribute-row';
	const powerLabel = document.createElement('div');
	powerLabel.className = 'attribute-label';
	powerLabel.textContent = 'Мощность:';
	const powerInput = document.createElement('input');
	powerInput.className = 'attribute-input';
	powerInput.type = 'text';
	powerInput.value = product.attributes.power;
	powerRow.append(powerLabel, powerInput);

	const colorRow = document.createElement('div');
	colorRow.className = 'attribute-row';
	const colorLabel = document.createElement('div');
	colorLabel.className = 'attribute-label';
	colorLabel.textContent = 'Цвет:';
	const colorInput = document.createElement('input');
	colorInput.className = 'attribute-input';
	colorInput.type = 'text';
	colorInput.value = product.attributes.color;
	colorRow.append(colorLabel, colorInput);

	attrWrapper.append(powerRow, colorRow);
	left.appendChild(attrWrapper);

	const right = document.createElement('div');
	right.className = 'card-column right-column';

	const rectangle = document.createElement('div');
	rectangle.className = 'product-image';
	rectangle.style.backgroundImage = `url('${product.image_url}')`;
	right.appendChild(rectangle);

	const uploadBtn = document.createElement('button');
	uploadBtn.className = 'photo-button';
	uploadBtn.textContent = 'Загрузить фото';
	right.appendChild(uploadBtn);

	uploadBtn.addEventListener('click', () => {
		document.getElementById('imageModal').style.display = 'flex';
		window._currentImageTarget = rectangle;
		window._currentProductRef = product;
	});

	const archiveBlock = document.createElement('div');
	archiveBlock.className = 'archive-block';

	const archiveCheckbox = document.createElement('input');
	archiveCheckbox.type = 'checkbox';
	archiveCheckbox.className = 'archive-checkbox';
	archiveCheckbox.checked = product.status === 'archive';

	const archiveLabel = document.createElement('span');
	archiveLabel.className = 'archive-label';
	archiveLabel.textContent = 'В архиве';

	archiveBlock.append(archiveCheckbox, archiveLabel);
	right.appendChild(archiveBlock);

	card.append(left, right);
	wrapper.appendChild(card);

	const saveWrapper = document.createElement('div');
	saveWrapper.className = 'save-wrapper';

	const saveBtn = document.createElement('button');
	saveBtn.className = 'save-button';
	saveBtn.textContent = 'Сохранить';


	saveWrapper.appendChild(saveBtn);
	wrapper.appendChild(saveWrapper);
	saveBtn.addEventListener('click', () => {
	const data = {
		name: nameInput.value,
		description: descInput.value,
		cost: Number(priceInput.value),
		status: archiveCheckbox.checked ? 'archived' : 'active',
		image_url: product.image_url,
		attributes: {
		power: powerInput.value,
		color: colorInput.value
		}
	};

	console.log('POST запрос:', JSON.stringify(data, null, 2));

	fetch('http://localhost:8001/products', {
		method: 'POST',
		headers: {
		'Content-Type': 'application/json',
		'Authorization': 'Bearer ' + localStorage.getItem('token')
		},
		body: JSON.stringify(data)
	})
		.then(res => {
		if (res.ok) {
			document.getElementById('successModal').style.display = 'flex';
			nameInput.value = '';
			priceInput.value = '';
			descInput.value = '';
			powerInput.value = '';
			colorInput.value = '';
			archiveCheckbox.checked = false;
			rectangle.style.backgroundImage = '';
			product.image_url = '';
		} else {
			alert("Ошибка создания товара: " + res.status);
		}
		})
		.catch(err => {
		console.error("Ошибка сети:", err);
		alert("Ошибка соединения с сервером");
    });
});


	return wrapper;
}

document.getElementById('saveModal')?.addEventListener('click', () => {
	const url = document.getElementById('imageUrlInput').value.trim();
	const file = document.getElementById('imageFileInput').files[0];

	if (url && window._currentImageTarget && window._currentProductRef) {
		window._currentImageTarget.style.backgroundImage = `url('${url}')`;
		window._currentProductRef.image_url = url;
	} else if (file) {
		const reader = new FileReader();
		reader.onload = function (e) {
			if (window._currentImageTarget && window._currentProductRef) {
				window._currentImageTarget.style.backgroundImage = `url('${e.target.result}')`;
				window._currentProductRef.image_url = e.target.result;
			}
		};
		reader.readAsDataURL(file);
	}

	document.getElementById('imageModal').style.display = 'none';
	document.getElementById('imageUrlInput').value = '';
	document.getElementById('imageFileInput').value = '';
});

document.getElementById('cancelModal')?.addEventListener('click', () => {
	document.getElementById('imageModal').style.display = 'none';
	document.getElementById('imageUrlInput').value = '';
	document.getElementById('imageFileInput').value = '';
});

document.getElementById('closeSuccess')?.addEventListener('click', () => {
	document.getElementById('successModal').style.display = 'none';
});

