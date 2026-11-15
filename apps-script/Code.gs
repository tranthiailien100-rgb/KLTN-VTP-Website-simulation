/**
 * Nhận kết quả đánh giá từ website demo và ghi vào Google Sheet.
 *
 * CÁCH DÙNG (chi tiết trong README.md):
 *  1. Tạo một Google Sheet trống.
 *  2. Trong Sheet: Tiện ích mở rộng (Extensions) → Apps Script, dán toàn bộ file này vào Code.gs.
 *  3. Triển khai (Deploy) → Triển khai mới → loại "Ứng dụng web":
 *       - Thực thi dưới tên: Tôi (Me)
 *       - Người có quyền truy cập: Bất kỳ ai (Anyone)
 *  4. Sao chép URL kết thúc bằng /exec → đặt vào biến môi trường VITE_APPS_SCRIPT_URL của website.
 *
 * Mỗi lần sửa code ở đây phải "Quản lý triển khai → Chỉnh sửa → Phiên bản mới" thì URL /exec mới nhận bản sửa.
 */

var SHEET_NAME = 'Responses'; // tên trang tính nhận dữ liệu (tự tạo nếu chưa có)

// Các cột cố định; cột điểm từng câu được thêm tự động theo câu hỏi trong src/config/surveyQuestions.js
var COL_TIME = 'Thời gian';
var COL_SESSION = 'Session ID';
var COL_CHOICE = 'Lựa chọn';
var COL_ORDER = 'Thứ tự đã xem';
var COL_CODE = 'Mã demo';

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var sheet = getSheet_();

    // Chống ghi trùng nếu trình duyệt gửi lại cùng một phiên
    if (data.sessionId && sessionExists_(sheet, data.sessionId)) {
      return json_({ ok: true, duplicate: true });
    }

    var row = {};
    row[COL_TIME] = data.localTime || data.timestamp || new Date();
    row[COL_SESSION] = data.sessionId || '';
    row[COL_CHOICE] = data.choiceLabel || data.choice || '';
    row[COL_ORDER] = data.order || '';
    row[COL_CODE] = data.demoCode || '';

    var scores = data.scores || {};
    var questions = data.questions || {};
    Object.keys(scores).forEach(function (id) {
      var header = questions[id] ? id + ': ' + questions[id] : id;
      row[header] = scores[id];
    });

    appendRow_(sheet, row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Mở URL /exec bằng trình duyệt để kiểm tra script đã triển khai đúng chưa.
function doGet() {
  return ContentService.createTextOutput('Apps Script nhận đánh giá đang hoạt động.');
}

// ---------------------------------------------------------------- helpers
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function sessionExists_(sheet, sessionId) {
  if (sheet.getLastRow() < 2) return false;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var col = headers.indexOf(COL_SESSION) + 1;
  if (!col) return false;
  var found = sheet.getRange(2, col, sheet.getLastRow() - 1, 1)
    .createTextFinder(sessionId).matchEntireCell(true).findNext();
  return !!found;
}

function appendRow_(sheet, rowObj) {
  var lastCol = sheet.getLastColumn();
  var headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

  // Thêm cột mới cho khóa chưa có (lần đầu hoặc khi thêm câu hỏi mới)
  Object.keys(rowObj).forEach(function (key) {
    if (headers.indexOf(key) === -1) {
      headers.push(key);
      sheet.getRange(1, headers.length).setValue(key).setFontWeight('bold');
    }
  });
  if (sheet.getFrozenRows() === 0) sheet.setFrozenRows(1);

  var values = headers.map(function (h) {
    return rowObj[h] !== undefined ? rowObj[h] : '';
  });
  sheet.appendRow(values);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
