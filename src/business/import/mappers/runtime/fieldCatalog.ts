/**
 * Business field sözlüğü — alias’lar (PR-101G).
 * AI / normalizer yok; yalnızca isim eşlemesi.
 */

import type { BusinessFieldDefinition } from './SemanticRule';

export const BUSINESS_FIELD_CATALOG: readonly BusinessFieldDefinition[] =
  Object.freeze([
    {
      fieldId: 'id',
      entityType: 'urun',
      aliases: ['id', 'kimlik', 'uuid', 'kod', 'ID', 'Id'],
      label: 'Kimlik'
    },
    {
      fieldId: 'name',
      entityType: 'urun',
      aliases: ['ad', 'adi', 'name', 'title', 'baslik', 'ürün adı', 'urun_adi'],
      label: 'Ad'
    },
    {
      fieldId: 'sku',
      entityType: 'urun',
      aliases: ['sku', 'urun_kodu', 'barkod', 'barcode', 'ürün kodu'],
      label: 'SKU'
    },
    {
      fieldId: 'quantity',
      entityType: 'stok',
      aliases: ['adet', 'miktar', 'qty', 'quantity', 'stok', 'stok_adedi'],
      label: 'Miktar'
    },
    {
      fieldId: 'price',
      entityType: 'urun',
      aliases: ['fiyat', 'tutar', 'price', 'amount', 'ucret', 'ücret'],
      label: 'Fiyat'
    },
    {
      fieldId: 'date',
      entityType: 'siparis',
      aliases: ['tarih', 'date', 'created_at', 'olusturma', 'oluşturma'],
      label: 'Tarih'
    },
    {
      fieldId: 'email',
      entityType: 'musteri',
      aliases: ['email', 'eposta', 'e-posta', 'mail'],
      label: 'E-posta'
    },
    {
      fieldId: 'phone',
      entityType: 'musteri',
      aliases: ['telefon', 'phone', 'gsm', 'tel', 'cep'],
      label: 'Telefon'
    },
    {
      fieldId: 'customer_name',
      entityType: 'musteri',
      aliases: [
        'musteri',
        'musteri_adi',
        'müşteri',
        'müşteri adı',
        'customer',
        'client',
        'alici'
      ],
      label: 'Müşteri Adı'
    },
    {
      fieldId: 'supplier_name',
      entityType: 'tedarikci',
      aliases: [
        'tedarikci',
        'tedarikci_adi',
        'supplier',
        'vendor',
        'satici',
        'satıcı'
      ],
      label: 'Tedarikçi Adı'
    },
    {
      fieldId: 'employee_name',
      entityType: 'personel',
      aliases: ['personel', 'personel_adi', 'employee', 'calisan', 'çalışan', 'sicil'],
      label: 'Personel Adı'
    },
    {
      fieldId: 'invoice_no',
      entityType: 'fatura',
      aliases: ['fatura', 'fatura_no', 'invoice', 'invoice_no'],
      label: 'Fatura No'
    },
    {
      fieldId: 'order_id',
      entityType: 'siparis',
      aliases: ['siparis', 'siparis_no', 'order', 'order_id', 'sipariş'],
      label: 'Sipariş No'
    },
    {
      fieldId: 'warehouse_id',
      entityType: 'depo',
      aliases: ['depo', 'depo_id', 'warehouse', 'warehouse_id', 'lokasyon'],
      label: 'Depo'
    },
    {
      fieldId: 'category_name',
      entityType: 'kategori',
      aliases: ['kategori', 'kategori_adi', 'category', 'category_name'],
      label: 'Kategori'
    },
    {
      fieldId: 'budget_code',
      entityType: 'butce',
      aliases: ['butce', 'bütçe', 'budget', 'butce_kodu', 'kalem'],
      label: 'Bütçe Kodu'
    }
  ]);
