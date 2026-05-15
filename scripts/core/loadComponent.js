async function loadComponent(id, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const html = await response.text();
    document.getElementById(id).innerHTML = html;
  } catch (err) {
    console.error(`Failed to load component: ${url}`, err);
  }
}
