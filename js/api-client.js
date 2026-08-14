/**
 * api-client.js
 * Тонкая обёртка над fetch для общения с REST API бекенда.
 * Изолирует остальной код от деталей HTTP (эндпоинты, заголовки, парсинг).
 */
const ApiClient = (() => {
  // Бекенд раздаёт и фронтенд, и API с одного origin — префикс относительный.
  const BASE_URL = '/api';
  const TIMEOUT_MS = 15000;

  /**
   * Обёртка над fetch с таймаутом
   */
  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeout);

      let payload = null;
      try {
        payload = await response.json();
      } catch (_) {
        // тело ответа могло быть пустым — это нормально, например для 204
      }

      if (!response.ok) {
        const error = new Error((payload && payload.error) || `Ошибка запроса: ${response.status}`);
        error.status = response.status;
        error.payload = payload;
        throw error;
      }

      return payload;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Сервер не отвечает. Проверьте соединение и попробуйте снова.');
      }
      throw err;
    }
  }

  return {
    /** Отправить заявку обратной связи */
    submitFeedback(data) {
      return request('/feedback', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /** Проверка доступности бекенда (используется перед retry из очереди) */
    async ping() {
      try {
        await request('/health');
        return true;
      } catch (_) {
        return false;
      }
    },
  };
})();
