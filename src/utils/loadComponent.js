export async function loadComponent(id, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
    const html = await response.text();
    const container = document.getElementById(id);
    if (container) {
        container.innerHTML = html;
    } else {
        console.warn(`Container #${id} not found for component: ${url}`);
    }
  } catch (err) {
    console.error(`Failed to load component: ${url}`, err);
  }
}
