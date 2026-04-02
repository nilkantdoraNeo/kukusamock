export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const safeMessage = status >= 500
    ? 'Server error'
    : (err.message || 'Request error');
  res.status(status).json({
    message: isProd ? safeMessage : (err.message || 'Server error')
  });
}
