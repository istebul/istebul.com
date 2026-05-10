import { TURKEY_LOCATIONS } from './turkey-locations.js';

export { TURKEY_LOCATIONS };

export const CAR_CATALOG = [
  ['Toyota', ['Corolla', 'C-HR', 'Yaris Cross', 'RAV4', 'Hilux', 'Proace City']],
  ['Renault', ['Clio', 'Megane Sedan', 'Captur', 'Austral', 'Kangoo', 'Taliant']],
  ['Fiat', ['Egea Sedan', 'Egea Cross', 'Egea Hatchback', 'Doblo', 'Fiorino', '500e']],
  ['Volkswagen', ['Polo', 'Golf', 'Passat', 'T-Roc', 'Tiguan', 'Caddy', 'Transporter']],
  ['Hyundai', ['i10', 'i20', 'Bayon', 'Elantra', 'Tucson', 'Kona', 'IONIQ 5']],
  ['Ford', ['Focus', 'Kuga', 'Puma', 'Tourneo Courier', 'Ranger', 'Transit Custom']],
  ['Peugeot', ['208', '308', '2008', '3008', '5008', 'Rifter']],
  ['Opel', ['Corsa', 'Astra', 'Mokka', 'Crossland', 'Grandland', 'Combo']],
  ['Citroen', ['C3', 'C3 Aircross', 'C4', 'C4 X', 'C5 Aircross', 'Berlingo']],
  ['Dacia', ['Sandero Stepway', 'Duster', 'Jogger', 'Spring']],
  ['Skoda', ['Fabia', 'Scala', 'Octavia', 'Kamiq', 'Karoq', 'Kodiaq', 'Superb']],
  ['Seat', ['Ibiza', 'Leon', 'Arona', 'Ateca']],
  ['Cupra', ['Formentor', 'Leon', 'Born', 'Ateca']],
  ['Honda', ['City', 'Civic', 'HR-V', 'CR-V', 'Jazz']],
  ['Kia', ['Picanto', 'Rio', 'Stonic', 'Ceed', 'Sportage', 'Sorento', 'EV6']],
  ['Nissan', ['Juke', 'Qashqai', 'X-Trail', 'Micra', 'Navara']],
  ['BMW', ['1 Serisi', '2 Serisi Gran Coupe', '3 Serisi', '5 Serisi', 'X1', 'X3', 'X5', 'iX1']],
  ['Mercedes-Benz', ['A Serisi', 'C Serisi', 'E Serisi', 'GLA', 'GLC', 'Vito', 'EQB']],
  ['Audi', ['A3', 'A4', 'A5', 'Q2', 'Q3', 'Q5', 'e-tron']],
  ['Volvo', ['XC40', 'XC60', 'XC90', 'S60', 'EX30']],
  ['Togg', ['T10X']],
  ['Tesla', ['Model 3', 'Model Y']],
  ['BYD', ['Atto 3', 'Dolphin', 'Seal', 'Seal U']],
  ['Chery', ['Omoda 5', 'Tiggo 7 Pro', 'Tiggo 8 Pro']],
  ['MG', ['ZS', 'HS', 'MG4', 'Marvel R']],
  ['Suzuki', ['Swift', 'Vitara', 'S-Cross', 'Jimny']],
  ['Mitsubishi', ['Space Star', 'L200']],
  ['Subaru', ['XV', 'Forester', 'Outback']],
  ['Land Rover', ['Range Rover Evoque', 'Discovery Sport', 'Defender']],
  ['Porsche', ['Macan', 'Cayenne', 'Taycan']]
].map(([brand, models]) => ({ brand, models }));

const place = (province, district, name, types) => ({ province, district, name, types });
export const VACATION_PLACES = [
  place('Antalya', 'Alanya', 'Alanya sahil tatili', ['familyResort', 'luxury']),
  place('Antalya', 'Kaş', 'Kaş dalış ve butik tatil', ['nature', 'luxury']),
  place('Antalya', 'Kemer', 'Kemer resort tatili', ['familyResort', 'luxury']),
  place('Antalya', 'Belek', 'Belek golf ve lüks resort', ['familyResort', 'luxury']),
  place('Antalya', 'Side', 'Side aile otelleri', ['familyResort', 'culture']),
  place('Muğla', 'Bodrum', 'Bodrum koyları', ['luxury', 'familyResort']),
  place('Muğla', 'Marmaris', 'Marmaris mavi tur', ['familyResort', 'nature']),
  place('Muğla', 'Fethiye', 'Fethiye Ölüdeniz', ['nature', 'familyResort']),
  place('Muğla', 'Datça', 'Datça sakin rota', ['nature', 'quiet']),
  place('Muğla', 'Akyaka', 'Akyaka doğa tatili', ['nature', 'quiet']),
  place('İzmir', 'Çeşme', 'Çeşme Alaçatı', ['luxury', 'familyResort']),
  place('İzmir', 'Urla', 'Urla bağ ve gastronomi', ['culture', 'quiet']),
  place('İzmir', 'Foça', 'Foça sahil rotası', ['nature', 'quiet']),
  place('Aydın', 'Kuşadası', 'Kuşadası sahil ve kültür', ['familyResort', 'culture']),
  place('Aydın', 'Didim', 'Didim yaz tatili', ['familyResort', 'quiet']),
  place('Balıkesir', 'Ayvalık', 'Ayvalık Cunda', ['culture', 'quiet']),
  place('Balıkesir', 'Edremit', 'Kazdağları ve sahil', ['nature', 'quiet']),
  place('Çanakkale', 'Bozcaada', 'Bozcaada bağ rotası', ['culture', 'quiet']),
  place('Çanakkale', 'Gökçeada', 'Gökçeada doğa tatili', ['nature', 'quiet']),
  place('Nevşehir', 'Göreme', 'Kapadokya balon ve kültür', ['culture', 'luxury']),
  place('Nevşehir', 'Ürgüp', 'Kapadokya butik oteller', ['culture', 'luxury']),
  place('Denizli', 'Pamukkale', 'Pamukkale termal ve kültür', ['culture', 'quiet']),
  place('Bursa', 'Uludağ', 'Uludağ kayak tatili', ['nature', 'luxury']),
  place('Kayseri', 'Erciyes', 'Erciyes kayak tatili', ['nature', 'familyResort']),
  place('Bolu', 'Abant', 'Abant göl tatili', ['nature', 'quiet']),
  place('Sakarya', 'Sapanca', 'Sapanca bungalov', ['nature', 'quiet']),
  place('Rize', 'Ayder', 'Ayder yayla tatili', ['nature', 'quiet']),
  place('Rize', 'Çamlıhemşin', 'Fırtına Vadisi', ['nature', 'quiet']),
  place('Trabzon', 'Uzungöl', 'Uzungöl doğa rotası', ['nature', 'familyResort']),
  place('Artvin', 'Şavşat', 'Şavşat sakin yaylalar', ['nature', 'quiet']),
  place('Kars', 'Sarıkamış', 'Sarıkamış kayak ve kış', ['nature', 'culture']),
  place('Mardin', 'Artuklu', 'Mardin kültür turu', ['culture', 'luxury']),
  place('Şanlıurfa', 'Harran', 'Göbeklitepe ve Harran', ['culture']),
  place('İstanbul', 'Fatih', 'Tarihi yarımada şehir gezisi', ['culture']),
  place('İstanbul', 'Beyoğlu', 'İstanbul şehir ve gastronomi', ['culture', 'luxury']),
  place('Ankara', 'Beypazarı', 'Beypazarı kültür rotası', ['culture', 'quiet']),
  place('Eskişehir', 'Odunpazarı', 'Odunpazarı şehir kaçamağı', ['culture']),
  place('Edirne', 'Merkez', 'Edirne kültür ve gastronomi', ['culture']),
  place('Kırklareli', 'İğneada', 'İğneada longoz ormanları', ['nature', 'quiet']),
  place('Sinop', 'Merkez', 'Sinop sahil ve kültür', ['culture', 'quiet']),
  place('Bartın', 'Amasra', 'Amasra sahil rotası', ['culture', 'quiet']),
  place('Mersin', 'Silifke', 'Silifke koyları', ['familyResort', 'quiet']),
  place('Mersin', 'Anamur', 'Anamur sahil tatili', ['familyResort', 'quiet'])
];

export const PROPERTY_TYPES = [
  { value: 'daire', label: 'Daire' },
  { value: 'yazlik', label: 'Yazlık' },
  { value: 'mustakil', label: 'Müstakil ev' },
  { value: 'villa', label: 'Villa' }
];

export const getProvinceOptions = () => TURKEY_LOCATIONS.map(({ province }) => ({ value: province, label: province }));
export const getDistrictOptions = (province) => {
  const location = TURKEY_LOCATIONS.find((item) => item.province === province);
  return (location?.districts || []).map((district) => ({ value: district, label: district }));
};
export const getCarModelOptions = () => [
  { value: 'any', label: 'Sistem benim için en uygun marka/modeli önersin' },
  ...CAR_CATALOG.flatMap(({ brand, models }) => models.map((model) => ({ value: `${brand}|${model}`, label: `${brand} ${model}` })))
];
export const flattenCarModels = () => CAR_CATALOG.flatMap(({ brand, models }) => models.map((model) => ({ brand, model })));
export const getVacationPlaceOptions = (province, district) => {
  const filtered = VACATION_PLACES.filter((place) => (!province || place.province === province) && (!district || place.district === district));
  return [
    { value: 'any', label: 'Sistem seçilen lokasyonda en uygun tatil yerini önersin' },
    ...filtered.map((item) => ({ value: `${item.province}|${item.district}|${item.name}`, label: item.name }))
  ];
};
