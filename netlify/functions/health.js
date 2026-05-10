exports.handler = async () => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  },
  body: JSON.stringify({
    status: 'ok',
    service: 'istebul',
    timestamp: new Date().toISOString()
  })
});
