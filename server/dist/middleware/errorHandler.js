export function errorHandler(err, _req, res, _next) { const message = err instanceof Error ? err.message : 'Unexpected server error'; res.status(400).json({ error: message, details: [] }); }
