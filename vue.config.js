module.exports = {
  devServer: {
    https: true,
    proxy: {
      '/api': {
        target: 'https://localhost:8000'
      }
    }
  }
};
