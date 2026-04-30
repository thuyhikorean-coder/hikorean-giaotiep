# Hướng dẫn kết nối Google Sheet (ELEARNING) làm Backend

Để trang web tự động gửi dữ liệu đăng ký về Sheet `ELEARNING` và kiểm tra trạng thái duyệt (Pending/Approved) mỗi khi học viên đăng nhập, chúng ta cần cài đặt **Google Apps Script** trên file Google Sheet Master Data của chị.

## Bước 1: Mở trình soạn thảo Script
1. Mở file Google Sheet Master Data của chị.
2. Trên thanh menu, chọn **Tiện ích mở rộng (Extensions)** > **Apps Script**.

## Bước 2: Dán mã Script và Cài đặt tự động
Xóa toàn bộ code cũ trong đó (nếu có) và dán đoạn code sau vào:

```javascript
var SHEET_NAME = 'ELEARNING';

// Hàm cài đặt tự động (Chạy 1 lần duy nhất)
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // Thiết lập tiêu đề cột
  var headers = ["Email / SĐT", "Mật khẩu", "Trạng thái (Pending/Approved)", "Tiến độ", "Mã thiết bị (Device ID)"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Làm đậm và tô màu nền cho tiêu đề
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f39c12").setFontColor("white");
  sheet.setColumnWidth(1, 200); // Email
  sheet.setColumnWidth(3, 200); // Trạng thái
  sheet.setColumnWidth(5, 250); // Device ID
  
  SpreadsheetApp.getUi().alert('✅ Cài đặt Sheet ELEARNING thành công!');
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var data = JSON.parse(e.postData.contents);
  var action = data.action;

  if (action === "register") {
    var email = data.email;
    var password = data.password;
    
    var dataRange = sheet.getDataRange().getValues();
    for (var i = 1; i < dataRange.length; i++) {
      if (dataRange[i][0] === email) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Tài khoản này đã được đăng ký!" })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Thêm dòng mới: Email, Pass, Pending, Tiến độ 0, Device ID rỗng
    sheet.appendRow([email, password, "Pending", "0/54", ""]);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Đăng ký thành công! Vui lòng chờ Admin duyệt." })).setMimeType(ContentService.MimeType.JSON);
    
  } else if (action === "login") {
    var email = data.email;
    var password = data.password;
    var deviceId = data.deviceId; // Mã thiết bị truyền lên từ trình duyệt
    
    var dataRange = sheet.getDataRange().getValues();
    for (var i = 1; i < dataRange.length; i++) {
      if (dataRange[i][0] === email && dataRange[i][1] === password) {
        var status = dataRange[i][2];
        var savedDeviceId = dataRange[i][4]; // Cột E: Device ID
        
        // Nếu chưa được duyệt
        if (status !== "Approved") {
            return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Tài khoản đang chờ duyệt." })).setMimeType(ContentService.MimeType.JSON);
        }

        // Logic khóa thiết bị
        if (!savedDeviceId || savedDeviceId === "") {
            // Lần đầu đăng nhập -> Lưu mã thiết bị này vào Sheet
            sheet.getRange(i + 1, 5).setValue(deviceId);
        } else if (savedDeviceId !== deviceId) {
            // Đăng nhập trên máy khác -> Báo lỗi
            return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "⛔ Tài khoản này đã được đăng nhập ở một thiết bị khác. Không được dùng chung tài khoản!" })).setMimeType(ContentService.MimeType.JSON);
        }
        
        return ContentService.createTextOutput(JSON.stringify({ status: "success", userStatus: status })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sai tài khoản hoặc mật khẩu!" })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("E-learning API is running").setMimeType(ContentService.MimeType.TEXT);
}
```

## Bước 3: Chạy hàm Setup để tự động tạo Sheet
1. Sau khi dán code xong, hãy nhìn lên thanh công cụ ở trên cùng, có một ô chọn hàm (mặc định đang là chữ `doPost` hoặc `myFunction`).
2. Chị bấm vào đó và chọn hàm **`setup`**.
3. Bấm nút **Chạy (Run)**. 
4. Google sẽ yêu cầu "Cấp quyền truy cập" (Review Permissions). Chị chọn Tài khoản của chị $\rightarrow$ Advanced (Nâng cao) $\rightarrow$ Go to... (Unsafe) $\rightarrow$ Allow (Cho phép).
5. Sau khi chạy xong, chị mở lại file Google Sheet sẽ thấy tự động có một Sheet mới tên là `ELEARNING` được định dạng tiêu đề màu cam cực kỳ đẹp!

## Bước 4: Triển khai (Deploy) để lấy Link Web App
1. Ấn nút **Lưu (Biểu tượng đĩa mềm)** ở trên cùng.
2. Góc trên cùng bên phải, bấm **Deploy (Triển khai)** > **New deployment (Triển khai mới)**.
3. Chạm vào hình bánh răng ⚙️ ở mục "Select type", chọn **Web app**.
4. Thiết lập như sau:
   - **Description:** API E-learning
   - **Execute as:** Me (Chính chị)
   - **Who has access:** Anyone (Bất kỳ ai)
5. Bấm **Deploy**. 
6. Copy đoạn link gọi là **Web app URL** (bắt đầu bằng `https://script.google.com/...`).

## Bước 4: Cập nhật vào Web
Chị copy đường **Web app URL** đó và dán vào cho em. Em sẽ lấy link đó đưa vào file `app.js` để tự động kết nối form Đăng nhập / Đăng ký của web vào thẳng Google Sheet của chị luôn!
