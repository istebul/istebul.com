/**
 * İSTEBUL Business — entity tip kayıtları (statik).
 */

import type {
  BusinessEntityTypeDefinition,
  BusinessEntityTypeId
} from './BusinessEntityType';

const ENTITY_TYPES: BusinessEntityTypeDefinition[] = [
  {
    id: 'urun',
    name: 'Ürün',
    description: 'Satılan veya stoklanan ürün kartları.',
    order: 1
  },
  {
    id: 'kategori',
    name: 'Kategori',
    description: 'Ürün ve hizmet sınıflandırma kategorileri.',
    order: 2
  },
  {
    id: 'stok',
    name: 'Stok',
    description: 'Stok seviyesi ve hareket özetleri.',
    order: 3
  },
  {
    id: 'depo',
    name: 'Depo',
    description: 'Depo ve lokasyon tanımları.',
    order: 4
  },
  {
    id: 'raf',
    name: 'Raf',
    description: 'Depo içi raf / konum tanımları.',
    order: 5
  },
  {
    id: 'sayim',
    name: 'Sayım',
    description: 'Envanter ve kör sayım kayıtları.',
    order: 6
  },
  {
    id: 'siparis',
    name: 'Sipariş',
    description: 'Satın alma veya satış siparişleri.',
    order: 7
  },
  {
    id: 'musteri',
    name: 'Müşteri',
    description: 'Müşteri ve alıcı kayıtları.',
    order: 8
  },
  {
    id: 'tedarikci',
    name: 'Tedarikçi',
    description: 'Tedarikçi ve satıcı kayıtları.',
    order: 9
  },
  {
    id: 'personel',
    name: 'Personel',
    description: 'Çalışan ve personel kayıtları.',
    order: 10
  },
  {
    id: 'departman',
    name: 'Departman',
    description: 'Organizasyon departmanları.',
    order: 11
  },
  {
    id: 'vardiya',
    name: 'Vardiya',
    description: 'Vardiya ve mesai planları.',
    order: 12
  },
  {
    id: 'gelir',
    name: 'Gelir',
    description: 'Gelir kalemleri ve tahakkuklar.',
    order: 13
  },
  {
    id: 'gider',
    name: 'Gider',
    description: 'Gider kalemleri ve harcamalar.',
    order: 14
  },
  {
    id: 'fatura',
    name: 'Fatura',
    description: 'Alış / satış faturaları.',
    order: 15
  },
  {
    id: 'tahsilat',
    name: 'Tahsilat',
    description: 'Müşteri tahsilat hareketleri.',
    order: 16
  },
  {
    id: 'odeme',
    name: 'Ödeme',
    description: 'Tedarikçi ve genel ödeme hareketleri.',
    order: 17
  },
  {
    id: 'butce',
    name: 'Bütçe',
    description: 'Bütçe planı ve gerçekleşen kalemler.',
    order: 18
  },
  {
    id: 'arac',
    name: 'Araç',
    description: 'Filo ve araç tanımları.',
    order: 19
  },
  {
    id: 'sevkiyat',
    name: 'Sevkiyat',
    description: 'Sevkiyat ve teslimat kayıtları.',
    order: 20
  },
  {
    id: 'gorev',
    name: 'Görev',
    description: 'Operasyonel görev ve iş kalemleri.',
    order: 21
  },
  {
    id: 'risk',
    name: 'Risk',
    description: 'Risk kayıtları ve değerlendirmeler.',
    order: 22
  },
  {
    id: 'kpi',
    name: 'KPI',
    description: 'Ölçüm ve KPI değer kayıtları.',
    order: 23
  },
  {
    id: 'dokuman',
    name: 'Doküman',
    description: 'İş dokümanı meta kayıtları.',
    order: 24
  }
];

export const ENTITY_TYPE_REGISTRY: readonly BusinessEntityTypeDefinition[] =
  Object.freeze(ENTITY_TYPES);

export function getEntityTypeById(
  id: BusinessEntityTypeId
): BusinessEntityTypeDefinition | undefined {
  return ENTITY_TYPE_REGISTRY.find((entry) => entry.id === id);
}

export function listEntityTypes(): readonly BusinessEntityTypeDefinition[] {
  return ENTITY_TYPE_REGISTRY;
}

export const ENTITY_TYPE_COUNT = ENTITY_TYPE_REGISTRY.length;

export default ENTITY_TYPE_REGISTRY;
