# readers/excel

**Excel Reader Runtime** (PR-101F / EPIC-101).

`IImportReader` altyapısı: yapısal workbook → ham satır/kolon (`ExcelReaderResult`),
CSV ile aynı tabular projeksiyon.

## Önemli kısıt

Projede **onaylı Excel npm kütüphanesi yoktur**. Bu PR:

- Gerçek `.xlsx` binary decode **eklemez**
- Yapısal `ExcelRawWorkbook` girdisi ile sheet/header/tip/telemetri sağlar
- Binary verilirse `EXCEL_BINARY_NOT_SUPPORTED` fırlatır

## Yetenekler (yapısal model)

- .xlsx registry metadata (uzantı / MIME)
- Çoklu sheet + sheet seçimi
- Header, boş satır atlama
- Hücre tipleri: string / number / boolean / date / empty
- Telemetri: sheet / satır / sütun / süre

## Bu PR’da yok

BusinessDataset, Semantic Mapping, Normalizer, AI, binary xlsx decode.
