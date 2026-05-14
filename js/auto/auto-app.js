import { recommendVehicles } from './auto-ai.js';

const formatter = new Intl.NumberFormat('tr-TR');

function readForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function renderResults(results) {
  const root = document.getElementById('auto-results');
  root.innerHTML = results.map(vehicle => `
    <article>
      <div class="score">${vehicle.score}/100</div>
      <h3>${vehicle.name}</h3>
      <p>${reason(vehicle)}</p>
      <div class="tags">
        <span>${vehicle.body.toUpperCase()}</span>
        <span>${fuelLabel(vehicle.fuel)}</span>
        <span>2. el: ${vehicle.resale}/10</span>
      </div>
      <div class="cost">
        <p><strong>Tahmini yıllık maliyet:</strong><br>${formatter.format(vehicle.costs.total)} ₺</p>
        <p>Yakıt/enerji: ${formatter.format(vehicle.costs.fuel)} ₺</p>
        <p>Sigorta: ${formatter.format(vehicle.costs.insurance)} ₺</p>
        <p>Bakım: ${formatter.format(vehicle.costs.maintenance)} ₺</p>
      </div>
      <button class="btn secondary" type="button">Kredi seçeneklerini gör</button>
    </article>
  `).join('');
}

function fuelLabel(fuel) {
  return { hybrid:'Hibrit', electric:'Elektrikli', gasoline:'Benzinli', diesel:'Dizel' }[fuel] || fuel;
}

function reason(vehicle) {
  if (vehicle.fuel === 'hybrid') return 'Yakıt ekonomisi, aile kullanımı ve ikinci el değeri açısından dengeli seçenek.';
  if (vehicle.fuel === 'electric') return 'Şehir içi kullanım ve düşük enerji maliyeti için güçlü alternatif.';
  if (vehicle.body === 'sedan') return 'Konfor, uzun yol ve ikinci el değeri açısından mantıklı tercih.';
  return 'Bütçe ve kullanım ihtiyacınıza göre dengeli bir seçenek.';
}

document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('auto-form');
renderResults(recommendVehicles(readForm(form)));

form.addEventListener('submit', (event) => {
  event.preventDefault();
  renderResults(recommendVehicles(readForm(form)));
});
