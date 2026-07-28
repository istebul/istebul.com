import type {
  BusinessDocumentCategory,
  DocumentClassification,
  DocumentClassificationSignal
} from '../models/DocumentClassification';
import type { NormalizedDocument } from '../models/NormalizedDocument';

const CATEGORY_TERMS: Readonly<
  Record<Exclude<BusinessDocumentCategory, 'unknown'>, string[]>
> = {
  sales: [
    'satis',
    'ciro',
    'gelir',
    'siparis',
    'urun',
    'adet',
    'fiyat',
    'tutar',
    'iskonto',
    'musteri'
  ],
  inventory: [
    'stok',
    'depo',
    'envanter',
    'malzeme',
    'urun_kodu',
    'sku',
    'giris',
    'cikis',
    'raf',
    'lokasyon'
  ],
  finance: [
    'gelir',
    'gider',
    'kar',
    'zarar',
    'bakiye',
    'nakit',
    'odeme',
    'tahsilat',
    'borc',
    'alacak',
    'fatura',
    'kdv'
  ],
  customers: [
    'musteri',
    'firma',
    'telefon',
    'eposta',
    'email',
    'segment',
    'crm',
    'temsilci',
    'adres',
    'sehir'
  ],
  hr: [
    'personel',
    'calisan',
    'sicil',
    'departman',
    'maas',
    'izin',
    'mesai',
    'performans',
    'ise_giris',
    'ise_cikis'
  ],
  operations: [
    'operasyon',
    'surec',
    'verimlilik',
    'kapasite',
    'uretim',
    'teslimat',
    'sevkiyat',
    'hata',
    'gecikme',
    'tamamlanma'
  ]
};

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '_');
}

function collectDocumentText(
  document: NormalizedDocument
): string {
  const columnText = document.tables
    .flatMap((table) =>
      table.columns.flatMap((column) => [
        column.key,
        column.label
      ])
    )
    .join(' ');

  return normalizeSearchText(
    [
      document.title,
      document.plainText.slice(0, 10_000),
      columnText
    ].join(' ')
  );
}

function buildSignal(
  category: Exclude<BusinessDocumentCategory, 'unknown'>,
  searchText: string
): DocumentClassificationSignal {
  const matchedTerms = CATEGORY_TERMS[category].filter((term) =>
    searchText.includes(normalizeSearchText(term))
  );

  return {
    category,
    score: matchedTerms.length,
    matchedTerms
  };
}

export class BusinessDocumentClassifier {
  classify(
    document: NormalizedDocument
  ): DocumentClassification {
    const searchText = collectDocumentText(document);

    const signals = (
      Object.keys(CATEGORY_TERMS) as Array<
        Exclude<BusinessDocumentCategory, 'unknown'>
      >
    )
      .map((category) => buildSignal(category, searchText))
      .sort((left, right) => right.score - left.score);

    const strongestSignal = signals[0];
    const totalScore = signals.reduce(
      (sum, signal) => sum + signal.score,
      0
    );

    const category: BusinessDocumentCategory =
      !strongestSignal || strongestSignal.score === 0
        ? 'unknown'
        : strongestSignal.category;

    const confidence =
      category === 'unknown' || totalScore === 0
        ? 0
        : Number(
            Math.min(
              strongestSignal.score / totalScore,
              1
            ).toFixed(2)
          );

    return {
      documentId: document.documentId,
      category,
      confidence,
      signals,
      classifiedAt: new Date().toISOString()
    };
  }
}
