# Demo "Theo dõi đơn hàng realtime" – Viettel Post (mô phỏng cho khóa luận)

Website **mô phỏng** để người tham gia khảo sát trải nghiệm hai giao diện tra cứu đơn hàng rồi đánh giá ngay trên web:

- **Giao diện tra cứu hiện tại** – bảng trạng thái dạng chữ, cập nhật thưa và chậm, không ảnh/bản đồ/thông báo.
- **Giao diện tracking mới** – timeline có ảnh bằng chứng, bản đồ hai cấp (toàn tuyến + chặng cuối), thông báo chủ động, xác nhận hai chiều ở **cả đầu gửi lẫn đầu nhận** (mã nhận hàng OTP), cảnh báo đơn đứng yên.

Chỉ có frontend (React + Vite + Tailwind), dữ liệu giả, không backend, không đăng nhập. Ngoại lệ duy nhất: kết quả đánh giá được gửi vào Google Sheet qua Google Apps Script.

> Đây không phải website chính thức của Viettel Post. Dải thông báo cố định ở đầu trang nói rõ điều này. Logo, ảnh, file và code của Viettel Post **không** được sao chép: logo thay bằng chữ, banner/ảnh là hình vẽ minh họa, ảnh bằng chứng là SVG minh họa (không có người thật).

---

## 1. Chạy local

Yêu cầu: **Node.js 20.19+ hoặc 22.12+** (kèm npm).

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in ra (mặc định http://localhost:5173).

| Lệnh | Việc |
|---|---|
| `npm run dev` | chạy local, tự tải lại khi sửa code |
| `npm run build` | build bản production vào `dist/` |
| `npm run preview` | xem thử bản build |
| `npm run test:sim` | kiểm thử engine mô phỏng (không cần trình duyệt) |
| `npm run mock:sheet` | máy chủ giả lập Google Apps Script để thử gửi đánh giá |

### Tham số URL

| Thêm vào URL | Tác dụng |
|---|---|
| `?admin=1` | mở **bảng điều khiển mô phỏng** bên phải (cho người thuyết trình) |
| `?reset=1` | xóa phiên khảo sát hiện tại (dùng khi nhiều người chung một máy) |
| `?code=183920475610` | điền sẵn mã vào ô tra cứu (dùng cho nút "Chia sẻ cho người nhận") |

Có thể kết hợp: `/?admin=1&reset=1`.

---

## 2. Luồng khảo sát

1. Người dùng vào trang (giao diện nền giống trang tra cứu của Viettel Post). Đầu khu tra cứu có thanh hướng dẫn, hai dấu "Đã xem giao diện hiện tại / mới" và nút **Đánh giá trải nghiệm**. Bên dưới là 4 thẻ đơn demo, mỗi thẻ ghi mã, một câu giải thích tình huống và trạng thái (Chưa xem / Đang xem / Đang xem dở / Hoàn tất).
2. **Bấm đơn nào trước cũng được.** Mỗi đơn có bản mô phỏng riêng: chuyển sang đơn khác thì đơn đang xem **tạm dừng và giữ nguyên tiến độ**, quay lại thì chạy tiếp. Chỉ đơn đang xem mới chạy đồng hồ. Nút "Chạy lại" chạy lại đơn đang xem từ đầu.
3. **Chuyển giao diện tự do.** Lần tra cứu đầu mở *giao diện tra cứu hiện tại*; nút gạt **"Giao diện tra cứu hiện tại | Giao diện tracking mới"** nằm ngay trên kết quả (và hiện thành nút nổi ở cuối màn hình khi cuộn xuống). Hai giao diện hiển thị **cùng một đơn ở cùng thời điểm**: chuyển qua lại không làm đơn chạy lại. Khi đơn chạy hết có nút "Chạy lại đơn này ở giao diện còn lại".
4. Nút **Đánh giá trải nghiệm** chỉ bật khi người dùng đã xem một đơn ở **cả hai** giao diện. Màn đánh giá: chọn 1 trong 2 giao diện (bắt buộc) + chấm 4 câu từ 1–5 (bắt buộc đủ) → **Gửi đánh giá** → "Cảm ơn bạn đã tham gia khảo sát". Màn đánh giá và màn cảm ơn đều có nút **Quay lại tra cứu đơn hàng**; sau khi gửi vẫn xem tiếp được nhưng không gửi lại lần hai trong cùng phiên.

Phiên lưu trong `sessionStorage`: refresh trang vẫn giữ phiên (đã xem giao diện nào, đã gửi chưa), đóng tab thì phiên mới. Tiến độ mô phỏng của các đơn **không** được lưu: refresh thì các đơn chạy lại từ đầu.

### Mã đơn demo

Ô tra cứu **chỉ nhận chữ số** giống mã phiếu gửi thật (gõ hoặc dán chữ, dấu cách, dấu gạch đều bị bỏ). Mã gồm 12 chữ số, là số tự đặt cho bản demo, không phải mã của đơn hàng thật.

| Mã | Tình huống |
|---|---|
| `183920475610` | Đơn 1 – shipper đến lấy hàng, Hà Nội → Đà Nẵng → TP.HCM, mọi thứ suôn sẻ (giao đúng mã OTP) |
| `183920475627` | Đơn 2 – người gửi tự mang ra bưu cục (ảnh mã QR, ảnh cân hàng, biên nhận điện tử); có một đoạn giao chậm kèm lý do |
| `183920475634` | Đơn 3 – sự cố lúc **lấy hàng**: shipper rời đi mà chưa cập nhật ảnh lấy hàng |
| `183920475641` | Đơn 4 – sự cố lúc **giao hàng**: bưu tá bấm "giao thành công" lệch địa chỉ ~1,3 km, không có mã OTP |

Nhập mã không đủ 12 số → "Mã phiếu gửi gồm 12 chữ số"; nhập mã khác → "Không tìm thấy, hãy dùng một mã đơn demo ở trên."

### Các tính năng của giao diện tracking mới

- **Chuỗi bàn giao có bằng chứng**: mỗi lần hàng đổi tay là một mốc (thời gian, địa điểm, người/bưu cục phụ trách, GPS, ảnh). Hai đầu đều có **ảnh + chữ ký khách**: lấy hàng có ảnh hàng và **chữ ký người gửi** (luồng B: ảnh cân hàng + chữ ký người gửi tại quầy), giao hàng có ảnh giao và **chữ ký người nhận** (kèm mã OTP). Bấm vào mốc để xem ảnh phóng to.
- **Chống "quên xác nhận"**
  - *Xác nhận hai chiều*: shipper rời địa chỉ mà chưa có ảnh → hộp hỏi người gửi "Bạn đã giao hàng cho bưu tá X chưa?" (Đã giao / Chưa giao / Để sau). Đồng hồ mô phỏng tạm dừng trong lúc hộp mở. **Đã giao** → ghi mốc lấy hàng, bưu tá tải lên muộn ảnh + chữ ký người gửi. **Chưa giao** → hàng vẫn ở nhà người gửi: CSKH liên hệ, bưu tá **quay lại lấy hàng** (ảnh + chữ ký), rồi hàng mới vào bưu cục.
  - *Khóa bước*: bưu cục quét nhập mà thiếu mốc "đã lấy hàng" (luồng A) hoặc thiếu ảnh cân hàng tại quầy (luồng B) → gắn cờ **"Thiếu mốc xác nhận"**, báo người gửi, hiện "CSKH đang kiểm tra" (đơn bị giữ 3 giờ mô phỏng rồi CSKH xác minh).
- **Chống "giao khống" ở đầu nhận**
  - *Mã nhận hàng (OTP)*: mã **chỉ được gửi khi bưu tá đã đến đúng địa chỉ** (mốc "Bưu tá đã đến địa chỉ người nhận", GPS trùng địa chỉ) — không gửi lúc xuất phát. Người nhận kiểm tra hàng rồi **cung cấp mã cho bưu tá nhập vào app**; mã khớp + ảnh giao hàng + chữ ký người nhận thì mới ghi "giao thành công". Người gửi thấy mã đã che (`••83`).
  - *Hỏi người nhận*: bưu tá bấm "giao" ở chỗ lệch (GPS cách ~1,3 km) → hệ thống **không gửi mã** mà hỏi "Bạn đã nhận được hàng chưa?". Người tham gia **trả lời thay người nhận** (hộp nói rõ điều này). Đã nhận → bưu tá vẫn phải **bổ sung ảnh giao hàng + chữ ký** rồi mới hoàn tất; Chưa nhận → gắn cờ, báo người gửi, CSKH xác minh (2 giờ mô phỏng) rồi bưu tá **quay lại đúng địa chỉ → mã mới → khớp mã**.
  - *Khóa bước đầu nhận*: không ai trả lời → đơn **không được "Hoàn tất"**, CSKH liên hệ người nhận rồi giao lại.
  - *Đóng vòng*: mốc cuối "Hoàn tất — người nhận đã nhận hàng" kèm biên nhận giao hàng gửi cho cả người gửi và người nhận; biên nhận ghi đúng cách đã xác thực ("mã nhận hàng + chữ ký" hoặc "người nhận xác nhận + chữ ký").
- **Thông báo**: chuông ở header (chỉ hiện ở chế độ mới), toast kèm "Đã gửi qua Zalo/SMS (mô phỏng)". Người dùng chọn một trong **hai chế độ** (khối "Thông báo cho tôi"; lựa chọn giữ cho mọi đơn trong phiên và được ghi vào Sheet):
  - **Báo đầy đủ** (mặc định): mọi mốc mới + **nhắc vị trí** khi lâu không có cập nhật (ngoài đời: mỗi 2 giờ). Lời nhắc hiện khi đã yên ~4 giây, với vị trí mới nhất của đơn.
  - **Chỉ khi đổi trạng thái**: chỉ báo khi đơn sang bước mới trên thanh tiến trình (lấy hàng, nhập bưu cục, trung chuyển, đang giao, hoàn tất).
  - Luôn gửi dù chọn chế độ nào: cảnh báo thiếu xác nhận, đơn đứng yên quá 12 giờ → CSKH, giao chậm, hộp hỏi xác nhận, mã nhận hàng.
  - Đo trên đơn 1: Báo đầy đủ ~12 toast (có nhắc vị trí), Chỉ khi đổi trạng thái ~6 toast.
- **Bản đồ hai cấp** (Leaflet + nền bản đồ Esri, xem mục 3): "Toàn tuyến" theo chặng bưu cục; "Chặng cuối" tự bật khi bưu tá xuất phát, hiện bưu tá di chuyển, khoảng cách còn lại và giờ giao dự kiến. Máy tính: bản đồ và timeline 2 cột; điện thoại: xếp chồng.
- **Giờ giao dự kiến** có lý do khi bị trễ; nút **Sao chép link theo dõi** / **Chia sẻ cho người nhận**.

### Chạy demo

Mặc định mô phỏng **tự chạy** với **đồng hồ co giãn** (dùng chung cho cả hai giao diện nên vẫn so sánh công bằng):

| Đoạn | Tốc độ |
|---|---|
| Lấy hàng, chặng cuối, giao hàng (khoảnh khắc đáng xem) | chậm — ≈ 20 phút mô phỏng / giây |
| Bình thường | ≈ 50 phút / giây |
| Nằm kho, trung chuyển liên tỉnh | nhanh — ≈ 200 phút / giây |

Mỗi đơn chạy hết trong khoảng **20–26 giây**; giao diện cũ không phải chờ quá ~11 giây liền. Có nút **Tạm dừng / Chạy lại** và đồng hồ mô phỏng ở cả hai giao diện.

**Toast thông báo** (giao diện mới) chỉ bật cho việc đáng chú ý: mốc đổi trạng thái chính, cảnh báo, hộp hỏi, CSKH, giao chậm. Mốc nhỏ (đến / xuất kho trung chuyển) và OTP chỉ vào **chuông**. Nhắc định kỳ chỉ bật khi đã ~4 giây không có toast nào và dùng chung một ô. Tối đa 2 toast cùng lúc, mỗi toast đứng 5 giây → khoảng 10 toast mỗi đơn; chuông vẫn giữ đủ ~26 thông báo.

Chỉnh tốc độ từng nhịp, số toast, thời gian đứng: [`src/config/pacing.js`](src/config/pacing.js); chặng nào chạy nhịp nào: `STEP_PACE` trong [`src/config/journeys.js`](src/config/journeys.js).

### Bảng điều khiển (`?admin=1`)

Panel bên phải, dùng được ở cả hai giao diện:

| Nút | Làm gì |
|---|---|
| Shipper cập nhật ảnh lấy hàng | tua tới mốc lấy hàng có ảnh; nếu đang chờ xác nhận thì shipper bổ sung ảnh muộn |
| Bưu cục quét nhập | tua tới mốc nhập bưu cục; nếu chưa có mốc lấy hàng → gắn cờ "Thiếu mốc xác nhận" |
| Quên xác nhận lấy hàng | luồng A: shipper rời đi mà chưa có ảnh → hộp hỏi người gửi; luồng B: quầy bỏ qua bước cân → khóa bước khi nhập kho |
| Đơn đứng yên quá 12h | giữ đơn 12 giờ mô phỏng → cảnh báo + "Đã chuyển CSKH" → CSKH xử lý, đơn đi tiếp |
| Bưu tá báo giao nhưng chưa giao | dùng được với mọi đơn: tua tới lúc bưu tá xuất phát, bưu tá đi lệch và bấm "giao" không có OTP → hộp hỏi người nhận |
| Giao thành công | tua nhanh tới mốc hoàn tất (nếu đang có sự cố giao thì bưu tá giao lại đúng OTP) |

Cũng có: tốc độ đồng hồ (0,5×–4×), tạm dừng/chạy lại, nhật ký sự kiện, "Bắt đầu phiên khảo sát mới". Các nút tự khóa khi không áp dụng được ở thời điểm đó.

Gợi ý trình bày hai "khoảng mù":
- **Đầu gửi** – đơn `183920475634`: ở giao diện cũ không thấy mốc lấy hàng, hàng đã qua bưu cục rồi mới có dòng tiếp theo; ở giao diện mới được hỏi xác nhận, bị gắn cờ nếu bỏ qua.
- **Đầu nhận** – đơn `183920475641`: ở giao diện cũ hiện ngay "Giao hàng thành công" tại bưu cục phát dù người nhận chưa có hàng; ở giao diện mới thấy GPS lệch, không có OTP, người nhận được hỏi và đơn chỉ "Hoàn tất" sau khi giao lại.

---

## 3. Sửa nội dung

| Muốn sửa | File |
|---|---|
| **Mã đơn demo** (thêm/đổi/xóa, luồng, kịch bản, tên thẻ và câu giải thích tình huống) | [`src/config/demoCodes.js`](src/config/demoCodes.js) |
| **Câu hỏi đánh giá** và chữ trên màn đánh giá | [`src/config/surveyQuestions.js`](src/config/surveyQuestions.js) |
| **Hành trình**: địa điểm, tuyến đường, các mốc, thời gian giữa các mốc, lý do giao chậm, tên nhân vật giả | [`src/config/journeys.js`](src/config/journeys.js) |
| **Tốc độ** đồng hồ (cơ bản, nhịp chậm/nhanh), **toast** (số lượng, thời gian đứng) | [`src/config/pacing.js`](src/config/pacing.js); chặng nào nhanh/chậm: `STEP_PACE` trong `journeys.js` |
| Ngưỡng 12 giờ, thời gian CSKH kiểm tra (lấy hàng / giao hàng) | hằng số ở đầu [`src/sim/engine.js`](src/sim/engine.js) |
| **Nền bản đồ** (nguồn tile cho "toàn tuyến" và "chặng cuối") | [`src/config/map.js`](src/config/map.js) |
| Menu, footer | [`src/config/menu.js`](src/config/menu.js), [`src/components/layout/Footer.jsx`](src/components/layout/Footer.jsx) |

Ví dụ thêm một câu hỏi: thêm `{ id: 'q5', text: 'Tôi sẽ giới thiệu dịch vụ cho người khác' }` vào `SURVEY_QUESTIONS`. Sheet sẽ tự có thêm cột.

Sau khi sửa `journeys.js` hoặc engine nên chạy `npm run test:sim` để chắc các kịch bản vẫn đúng.

> Mọi nút/menu/link quanh trang (đăng nhập, dịch vụ, tin tức, tải app, hotline, mạng xã hội, footer…) chỉ giữ hình thức: bấm vào hiện toast "Chức năng không nằm trong phạm vi demo". Chỉ ô tra cứu mã vận đơn và khu vực kết quả hoạt động.

---

## 4. Nhận kết quả vào Google Sheet

Kết quả gửi lên gồm: thời gian, lựa chọn, điểm từng câu, cách đã xem, các mã đơn đã xem và mã phiên (ẩn danh, không thu thông tin cá nhân).

- Cột **"Thứ tự đã xem"** ghi giao diện mở đầu tiên, số lần chuyển giao diện, thời gian xem mỗi giao diện và chế độ thông báo đã chọn, ví dụ `Hiện tại trước · chuyển 4 lần · hiện tại 2 phút 10 giây / mới 3 phút 05 giây · thông báo: đầy đủ (mặc định)`.
- Cột **"Mã demo"** ghi các mã đơn đã xem theo thứ tự lần đầu mở, ví dụ `183920475634, 183920475610`.
- Lưu ý cho phần phương pháp: người tham gia tự chọn và tự chuyển giao diện, nên thứ tự xem **không** được cân bằng ngẫu nhiên; dùng các số liệu trên để mô tả hành vi xem.

### Bước 1 – Tạo Google Sheet và Apps Script
1. Tạo một Google Sheet trống (đặt tên tùy ý).
2. Trong Sheet: **Tiện ích mở rộng → Apps Script**.
3. Xóa code mẫu, dán toàn bộ nội dung file [`apps-script/Code.gs`](apps-script/Code.gs) → **Lưu**.

### Bước 2 – Triển khai thành Web App
1. **Triển khai → Triển khai mới → chọn loại "Ứng dụng web"**.
2. *Thực thi dưới tên*: **Tôi**. *Người có quyền truy cập*: **Bất kỳ ai**.
3. Bấm **Triển khai**, cấp quyền khi được hỏi (Google có thể cảnh báo "ứng dụng chưa được xác minh" – chọn *Nâng cao → Tiếp tục* vì đây là script của chính bạn).
4. Sao chép **URL ứng dụng web** (kết thúc bằng `/exec`). Mở URL đó trên trình duyệt, thấy dòng "Apps Script nhận đánh giá đang hoạt động" là đúng.

Mỗi lần sửa `Code.gs`: **Triển khai → Quản lý triển khai → biểu tượng bút → Phiên bản mới → Triển khai**, URL `/exec` giữ nguyên.

### Bước 3 – Đặt URL vào website
- **Local**: tạo file `.env` (xem mẫu `.env.example`):
  ```
  VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXXXXXX/exec
  ```
  rồi chạy lại `npm run dev`.
- **Vercel**: Project → Settings → Environment Variables → thêm `VITE_APPS_SCRIPT_URL` → **Redeploy** (biến `VITE_` được nhúng vào bản build nên phải build lại sau khi đổi).

Sheet sẽ tự tạo trang tính `Responses` với dòng tiêu đề ở lần gửi đầu tiên.

### Lưu ý
- Trình duyệt gửi bằng `fetch` chế độ `no-cors` (Apps Script không trả header CORS) nên **không đọc được phản hồi**; website chỉ biết request đã được gửi đi. Hãy tự thử một lượt và kiểm tra dòng mới xuất hiện trong Sheet trước buổi khảo sát thật.
- Nếu chưa đặt `VITE_APPS_SCRIPT_URL`, demo vẫn chạy bình thường nhưng kết quả chỉ được lưu tạm trong `localStorage` của trình duyệt (khóa `vtp-demo-results-local`) và in ra console.
- URL Apps Script nằm trong bản build nên ai mở DevTools cũng thấy; script chỉ **thêm dòng** vào Sheet và chống ghi trùng theo mã phiên. Nếu lo bị gửi bậy, có thể thêm một "mã khảo sát" bí mật vào payload và kiểm tra trong `doPost`.
- Thử cục bộ không cần Google: chạy `npm run mock:sheet`, đặt `VITE_APPS_SCRIPT_URL=http://localhost:8788/exec` trong `.env.local`, khởi động lại `npm run dev`, làm một lượt demo và xem dữ liệu in ra ở cửa sổ mock.

---

## 5. Deploy lên Vercel

Đây là site tĩnh (Vite) nên Vercel tự nhận cấu hình: *Build Command* `npm run build`, *Output Directory* `dist`.

**Cách A – qua GitHub (khuyên dùng)**
1. Đẩy thư mục dự án lên một repo GitHub (đã có `.gitignore`, `node_modules` và `.env` không bị đẩy).
2. Vào vercel.com → **Add New… → Project** → chọn repo → Framework *Vite* được tự nhận → thêm biến môi trường `VITE_APPS_SCRIPT_URL` → **Deploy**.

**Cách B – dùng CLI**
```bash
npm i -g vercel
vercel          # lần đầu: đăng nhập và trả lời vài câu hỏi
vercel --prod   # đưa lên production
```
Thêm biến môi trường: `vercel env add VITE_APPS_SCRIPT_URL` (hoặc trên giao diện web), rồi deploy lại.

`vercel.json` chỉ thêm header `X-Robots-Tag: noindex`, cùng với `public/robots.txt`, để công cụ tìm kiếm không lập chỉ mục bản demo.

Sau khi deploy: mở `https://<tên-dự-án>.vercel.app/?admin=1` để dùng bảng điều khiển; liên kết gửi cho người tham gia thì **không** kèm `?admin=1`.

---

## 6. Cấu trúc mã nguồn

```
src/
  config/        mã demo, câu hỏi, hành trình giả, menu          ← nơi chỉnh nội dung
  sim/           engine mô phỏng (thuần JS, không phụ thuộc React), hình học, định dạng giờ
  state/         phiên khảo sát, đồng hồ mô phỏng, toast
  components/
    layout/      dải thông báo, header, menu, banner, footer, tiện ích nổi
    tracking/    form tra cứu, giao diện cũ/mới, timeline, bản đồ, hộp xác nhận, chuông thông báo
    eval/        màn đánh giá + cảm ơn
    admin/       bảng điều khiển ?admin=1
  lib/           gửi kết quả (Google Apps Script)
scripts/         sim-check.mjs (kiểm thử engine), mock-sheet-server.mjs
apps-script/     Code.gs mẫu cho Google Sheet
```

Engine (`src/sim/engine.js`) là một reducer thuần: trạng thái = danh sách mốc + thông báo + cờ; giao diện chỉ gửi `TICK`, trả lời hộp hỏi và lệnh bảng điều khiển. Nhờ vậy mọi kịch bản được kiểm thử bằng `npm run test:sim` mà không cần mở trình duyệt.

## 7. Giả định & lưu ý nghiên cứu

- Chuông thông báo **ẩn hoàn toàn** ở giao diện cũ (giao diện hiện tại không có thông báo); thông báo, bản đồ, ảnh chỉ có ở giao diện mới.
- Phần chấm điểm 1–5 là **một bộ điểm** (không tách riêng cho từng giao diện); câu dẫn trên màn đánh giá nói rõ là chấm cho giao diện đã chọn. Nếu muốn chấm riêng từng giao diện, cần chỉnh `EvaluationScreen.jsx` và `Code.gs`.
- Ô tra cứu bỏ reCAPTCHA của trang gốc để không gây phiền cho người tham gia; không có hình thức tra cứu nhiều mã cùng lúc.
- Font dùng Mulish (Google Fonts) thay cho font gốc của trang tham chiếu.
- Nền bản đồ lấy từ dịch vụ tile công cộng của Esri (không cần API key), đủ cho lưu lượng nhỏ của một đợt khảo sát và có ghi nguồn ở góc bản đồ. Nếu dùng cho đông người hoặc mục đích thương mại, hãy kiểm tra điều khoản của Esri hoặc đổi sang nhà cung cấp có khóa riêng trong `src/config/map.js`.
- Không dùng tile chuẩn của OpenStreetMap vì lớp tile đó vẽ cả "đường chín đoạn" ở Biển Đông. Nếu đổi sang nguồn khác, hãy kiểm tra bằng mắt vùng Biển Đông (cả đường ranh giới lẫn nhãn) trước khi dùng.
- Toàn bộ tên người, địa chỉ, số điện thoại, mã GPS và ảnh trong demo là dữ liệu minh họa.
