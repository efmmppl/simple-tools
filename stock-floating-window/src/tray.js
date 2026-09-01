function syncTrayMenuItem(menuItem, value) {
  if (menuItem) menuItem.checked = Boolean(value);
}

module.exports = { syncTrayMenuItem };
