/**
 * 📊 TrackKaro AI — Autonomous Google Sheets CRM Sync Script
 * 
 * Paste this into: Extensions -> Apps Script inside your Google Sheet:
 * "Freelance Agency CRM & Strategy Tracker"
 * 
 * Then click: Deploy -> New Deployment -> Type: Web App
 * - Execute as: Me
 * - Who has access: Anyone
 * Copy the Web App URL and set in harvey/.env as:
 * GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    system: "TrackKaro AI — Autonomous CRM Sync Webhook",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Prospect Tracker (CRM)") || ss.getSheetByName("Sheet1") || ss.getSheets()[0];
    
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }
    
    var targetEmail = (data.email || "").toString().trim().toLowerCase();
    var targetCompany = (data.company || "").toString().trim().toLowerCase();
    var newStatus = data.status || "Contacted";
    var notes = data.notes || "";
    var nowStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd MMM, hh:mm a");

    if (!targetEmail && !targetCompany) {
      return ContentService.createTextOutput(JSON.stringify({ result: "skipped", reason: "no email or company provided" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = sheet.getLastRow();
    var matchedRow = -1;

    // Search existing rows (from Row 2 downwards)
    if (lastRow > 1) {
      var values = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
      for (var i = 0; i < values.length; i++) {
        var rowCompany = (values[i][0] || "").toString().trim().toLowerCase(); // Col A: Company
        var rowContact = (values[i][5] || "").toString().trim().toLowerCase(); // Col F: Direct Contact (Email)

        if ((targetEmail && rowContact.indexOf(targetEmail) !== -1) || 
            (targetCompany && (rowCompany.indexOf(targetCompany) !== -1 || targetCompany.indexOf(rowCompany) !== -1))) {
          matchedRow = i + 2; // 1-indexed and account for header
          break;
        }
      }
    }

    if (matchedRow !== -1) {
      // Row Found -> Update Column H (Outreach Status, Col 8)
      var statusCell = sheet.getRange(matchedRow, 8);
      statusCell.setValue(newStatus);
      
      // Apply color coding based on Outreach Status
      if (newStatus.indexOf("Replied") !== -1 || newStatus.indexOf("🔥") !== -1) {
        statusCell.setBackground("#bbf7d0").setFontColor("#166534").setFontWeight("bold"); // Emerald Green
      } else if (newStatus.indexOf("Contacted") !== -1 || newStatus.indexOf("🚀") !== -1) {
        statusCell.setBackground("#e0f2fe").setFontColor("#0369a1").setFontWeight("bold"); // Light Sky Blue
      } else if (newStatus.indexOf("Catch-All") !== -1 || newStatus.indexOf("⚠️") !== -1) {
        statusCell.setBackground("#fef3c7").setFontColor("#92400e").setFontWeight("bold"); // Warm Amber
      } else if (newStatus.indexOf("Verified") !== -1 || newStatus.indexOf("✅") !== -1) {
        statusCell.setBackground("#dcfce7").setFontColor("#15803d").setFontWeight("bold"); // Soft Green
      } else if (newStatus.indexOf("Bounced") !== -1 || newStatus.indexOf("❌") !== -1) {
        statusCell.setBackground("#fee2e2").setFontColor("#991b1b").setFontWeight("bold"); // Soft Red
      }

      // Update Column L (Strategy Notes, Col 12)
      if (notes) {
        var notesCell = sheet.getRange(matchedRow, 12);
        var existingNotes = notesCell.getValue() || "";
        notesCell.setValue(existingNotes + " | " + nowStr + ": " + notes);
      }

      return ContentService.createTextOutput(JSON.stringify({
        result: "updated",
        row: matchedRow,
        status: newStatus,
        email: targetEmail
      })).setMimeType(ContentService.MimeType.JSON);

    } else {
      // Not found -> Append as a new row
      sheet.appendRow([
        data.company || "New Prospect",
        "Global",
        "Target Account",
        "Speed-to-Lead Decay",
        data.name || "Decision Maker",
        targetEmail + " • Form",
        data.score || 95,
        newStatus,
        "$3,000 – $6,000",
        data.website || "—",
        data.linkedin || "—",
        nowStr + ": " + (notes || "Auto-scouted by Harvey AI")
      ]);

      var newRow = sheet.getLastRow();
      var newStatusCell = sheet.getRange(newRow, 8);
      if (newStatus.indexOf("Catch-All") !== -1) {
        newStatusCell.setBackground("#fef3c7").setFontColor("#92400e").setFontWeight("bold");
      } else if (newStatus.indexOf("Verified") !== -1) {
        newStatusCell.setBackground("#dcfce7").setFontColor("#15803d").setFontWeight("bold");
      }

      return ContentService.createTextOutput(JSON.stringify({
        result: "appended",
        row: newRow,
        status: newStatus,
        email: targetEmail
      })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Adds a custom menu inside Google Sheets to format colors and setup filters with 1 click.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("⚡ TrackKaro CRM")
    .addItem("🎨 Format Row Colors & Filters", "formatCrmSheet")
    .addToUi();
}

function formatCrmSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var statusRange = sheet.getRange(2, 8, lastRow - 1, 1);
  var values = statusRange.getValues();

  for (var i = 0; i < values.length; i++) {
    var val = (values[i][0] || "").toString();
    var cell = sheet.getRange(i + 2, 8);
    if (val.indexOf("Replied") !== -1 || val.indexOf("🔥") !== -1) {
      cell.setBackground("#bbf7d0").setFontColor("#166534").setFontWeight("bold");
    } else if (val.indexOf("Contacted") !== -1 || val.indexOf("🚀") !== -1) {
      cell.setBackground("#e0f2fe").setFontColor("#0369a1").setFontWeight("bold");
    } else if (val.indexOf("Catch-All") !== -1 || val.indexOf("⚠️") !== -1) {
      cell.setBackground("#fef3c7").setFontColor("#92400e").setFontWeight("bold");
    } else if (val.indexOf("Verified") !== -1 || val.indexOf("✅") !== -1) {
      cell.setBackground("#dcfce7").setFontColor("#15803d").setFontWeight("bold");
    } else if (val.indexOf("Bounced") !== -1 || val.indexOf("❌") !== -1) {
      cell.setBackground("#fee2e2").setFontColor("#991b1b").setFontWeight("bold");
    }
  }

  // Ensure header has filter enabled
  var range = sheet.getRange(1, 1, lastRow, 12);
  if (!sheet.getFilter()) {
    range.createFilter();
  }
  SpreadsheetApp.getActiveSpreadsheet().toast("CRM Sheet styled and filter enabled!", "TrackKaro AI", 3);
}
