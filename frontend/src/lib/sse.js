/**
 * Subscribes to the real-time Server-Sent Events (SSE) stream for intrusion detection and access alerts.
 */
export function subscribeToAlerts(creatorToken, { onAlert, onConnected, onError }) {
  if (!creatorToken) return () => {};

  const eventSource = new EventSource(`/api/alerts/stream?creatorToken=${encodeURIComponent(creatorToken)}`);

  eventSource.addEventListener('INIT', (e) => {
    try {
      const data = JSON.parse(e.data);
      onConnected && onConnected(data);
    } catch (err) {
      console.warn('SSE parse error on INIT:', err);
    }
  });

  const alertTypes = ['CREATED', 'CONSUMED', 'VIEWED', 'INTRUSION_ATTEMPT', 'EXPIRED'];
  alertTypes.forEach((type) => {
    eventSource.addEventListener(type, (e) => {
      try {
        const data = JSON.parse(e.data);
        onAlert && onAlert(data);
      } catch (err) {
        console.warn(`SSE parse error on ${type}:`, err);
      }
    });
  });

  // Fallback generic message handler
  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onAlert && onAlert(data);
    } catch {
      // heartbeats or comments
    }
  };

  eventSource.onerror = (err) => {
    onError && onError(err);
  };

  return () => {
    eventSource.close();
  };
}
