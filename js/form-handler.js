/**
 * form-handler.js
 * Вся логика формы обратной связи: клиентская валидация, отправка на бекенд,
 * состояния загрузки/ошибки/успеха, сохранение в localStorage при потере сети
 * и повторная отправка, когда соединение восстановится.
 */
const FormHandler = (() => {
  const QUEUE_KEY = 'cloudpage:feedback-queue';

  // Обязательны только имя и телефон. Почта и описание — по желанию,
  // но если заполнены, проверяем формат.
  const rules = {
    name: (v) => (v.trim().length >= 2 ? null : 'Введите имя (минимум 2 символа)'),
    contact: (v) => {
      const digits = v.replace(/\D/g, '');
      if (!v.trim()) return 'Укажите телефон для связи';
      return digits.length >= 10 ? null : 'Проверьте номер телефона';
    },
    email: (v) => {
      if (!v.trim()) return null;                       // поле необязательное
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : 'Проверьте адрес почты';
    },
    message: (v) => (!v.trim() || v.trim().length >= 5 ? null : 'Опишите задачу чуть подробнее'),
  };

  function validateField(name, value) {
    const rule = rules[name];
    return rule ? rule(value) : null;
  }

  function setFieldError(form, name, message) {
    const field = form.querySelector(`[name="${name}"]`);
    if (!field) return;
    const wrapper = field.closest('.form-field') || field.parentElement;
    wrapper.classList.toggle('has-error', Boolean(message));
    let errorEl = wrapper.querySelector('.form-field__error');
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'form-field__error';
      wrapper.appendChild(errorEl);
    }
    errorEl.textContent = message || '';
  }

  function validateForm(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    let isValid = true;

    Object.keys(rules).forEach((name) => {
      const error = validateField(name, data[name] || '');
      setFieldError(form, name, error);
      if (error) isValid = false;
    });

    return { isValid, data };
  }

  /* ---------- Offline-очередь в localStorage ---------- */

  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
    } catch (_) {
      return [];
    }
  }

  function saveQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  function enqueue(data) {
    const queue = getQueue();
    queue.push({ ...data, queuedAt: new Date().toISOString() });
    saveQueue(queue);
  }

  /** Пытается отправить все заявки из очереди. Успешные — удаляет. */
  async function flushQueue() {
    const queue = getQueue();
    if (!queue.length) return;

    const online = await ApiClient.ping();
    if (!online) return;

    const remaining = [];
    for (const item of queue) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await ApiClient.submitFeedback(item);
        Notifications.show('Отправлена ранее сохранённая заявка', 'success');
      } catch (_) {
        remaining.push(item); // не получилось — оставляем в очереди
      }
    }
    saveQueue(remaining);
  }

  /* ---------- Обработка отправки формы ---------- */

  function setLoading(button, isLoading) {
    button.classList.toggle('is-loading', isLoading);
    button.disabled = isLoading;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('#submit-btn');
    const status = form.querySelector('#form-status');

    const { isValid, data } = validateForm(form);
    if (!isValid) {
      Notifications.show('Проверьте правильность заполнения полей', 'error');
      return;
    }

    setLoading(button, true);
    if (status) status.classList.add('hidden');

    try {
      await ApiClient.submitFeedback(data);
      form.reset();
      Notifications.show('Заявка отправлена! Мы свяжемся с вами в ближайшее время.', 'success');
      if (status) {
        status.textContent = '✓ Спасибо! Заявка принята.';
        status.classList.remove('hidden');
        status.style.color = '#22c55e';
      }
    } catch (err) {
      // Если проблема сети — не теряем данные пользователя, сохраняем локально
      if (!navigator.onLine || err.message.includes('отвечает')) {
        enqueue(data);
        Notifications.show('Нет соединения. Заявка сохранена и будет отправлена автоматически.', 'info');
        form.reset();
      } else if (err.payload && err.payload.errors) {
        Object.entries(err.payload.errors).forEach(([field, message]) => setFieldError(form, field, message));
        Notifications.show('Проверьте форму — есть ошибки', 'error');
      } else {
        Notifications.show(err.message || 'Не удалось отправить заявку. Попробуйте позже.', 'error');
      }
      if (status) {
        status.textContent = '✗ Что-то пошло не так. Попробуйте ещё раз.';
        status.classList.remove('hidden');
        status.style.color = '#ef4444';
      }
    } finally {
      setLoading(button, false);
    }
  }

  function init() {
    const form = document.getElementById('tg-form');
    if (!form) return;

    form.addEventListener('submit', handleSubmit);

    // Живая валидация по мере ввода — убираем ошибку, как только поле стало валидным
    Object.keys(rules).forEach((name) => {
      const field = form.querySelector(`[name="${name}"]`);
      if (!field) return;
      field.addEventListener('blur', () => setFieldError(form, name, validateField(name, field.value)));
      field.addEventListener('input', () => {
        if (field.closest('.form-field')?.classList.contains('has-error')) {
          setFieldError(form, name, validateField(name, field.value));
        }
      });
    });

    // Пытаемся отправить отложенные заявки при загрузке и при восстановлении сети
    flushQueue();
    window.addEventListener('online', flushQueue);
  }

  return { init, flushQueue };
})();
