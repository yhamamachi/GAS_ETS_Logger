/**
 * 参考
 * https://tonari-it.com/gas-slides-presentation/
 * https://qiita.com/akitkat/items/0f7bd3101eaf3e612203
 * https://for-dummies.net/gas-noobs/gas-japanese-reference-for-slides/
 */
/**
 * Dependency:
 *   This script depends target sheet. Please customize this script or adjust target sheet.
 *
 *   SLIDE_OUTPUT_DIR_ID:
 *     Before using this script, you should set this property to specify slide output directory.
 */

/**
 * Config
 */
GenerateSlide_config = {
  reference_sheet_name: "MonthlyReport",
  slide_name_base: "S4_ETS_logger",
  // 全体サイズは、720 x 400くらいに見える。
  title_size_list: [20, 25, 680, 45], // left, top, width, height
};

/**
 * Global variable/process
 */
// sheet/charts
const GenerateSlide_sheet =
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    GenerateSlide_config["reference_sheet_name"]
  );
const GenerateSlide_chartsDict = {};
GenerateSlide_sheet.getCharts().forEach(function (chart, idx) {
  title = chart.getOptions().get("title");
  GenerateSlide_chartsDict[title] = chart;
});

/**
 * Trigger Function
 */
function GenerateSlide_generateSlide(_config = GenerateSlide_config) {
  // yyyymm
  const _slide_date = new Date();
  const date_last_month_yyyymm = Utilities.formatDate(
    new Date(_slide_date.getFullYear(), _slide_date.getMonth() - 1, 1),
    "JST",
    "yyyyMM"
  );
  const date_this_month_yyyymm = Utilities.formatDate(
    _slide_date,
    "JST",
    "yyyyMM"
  );

  // get year of last month, then set it B1 cell of 'MonthlyReport' sheet
  const date_last_month_yyyy = Utilities.formatDate(
    new Date(_slide_date.getFullYear(), _slide_date.getMonth() - 1, 1),
    "JST",
    "yyyy"
  );
  var range = GenerateSlide_sheet.getRange("B1").setValue(date_last_month_yyyy);

  // output folder settings
  const new_slide_name = _config["slide_name_base"] + "_latest";
  const backup_slide_name =
    _config["slide_name_base"] + "_" + date_this_month_yyyymm;
  const folderId = PropertiesService.getScriptProperties().getProperty(
    "SLIDE_OUTPUT_DIR_ID"
  ); // slide_output directory

  //生成先のスライド
  var drive_slide =
    DriveApp.getFolderById(folderId).getFilesByName(new_slide_name);
  if (drive_slide.hasNext() == false) {
    // もしスライドがないならoutput directoryに新規作成する。
    var newPresentation = SlidesApp.create(new_slide_name);
    _move_slide(newPresentation.getId(), folderId);
  } else var newPresentation = SlidesApp.openById(drive_slide.next().getId());
  // 開始前に全データ削除する。
  var slides = newPresentation.getSlides();
  for (var i = 0; i < slides.length; i++) {
    slides[i].remove();
  }
  /**
   * For debug: 実際はスライドの内容を追加するような関数を呼び出すこと。
   * 空白ページのはず。
   */
  // Add Dummy page
  // _appendDummyPage(newPresentation)

  // Add each page
  _appendTitlePage(newPresentation); // タイトルスライド。更新日時の記載用。
  // _appendDownloadPage(newPresentation) // Currently, no data about download pages
  _appendRulzPage(newPresentation);
  _appendFAQPage(newPresentation);

  /**
   * For debug: MonthlyReportシートのグラフをすべて確認する際に使用する。
   */
  /*
  charts.forEach( function (chart, idx){
      var slide = newPresentation.appendSlide()
      slide.insertTextBox("Chart:"+idx, ...GenerateSlide_config["title_size_list"]).getText().getTextStyle().setFontSize(32)
      slide.insertTextBox(chart.getOptions.get("title"), ...[30, 70, 680, 320]).getText().getTextStyle().setFontSize(18)
      slide.insertSheetsChartAsImage(chart, ...chart_upper_right_size_list)
  })
  */

  /**
   * バックアップとして、名前に日付(_YYYYMM)入りのスライドを作成する。
   */
  _backup_slide(newPresentation.getId(), backup_slide_name);
}

/**
 * Sub Functions for SlideApp
 */
function _backup_slide(CopyFromFileId, CopyToFileName) {
  // backupファイルで同名のものがある場合、あらかじめ削除しておく
  var fileData = DriveApp.getFilesByName(CopyToFileName);
  while (fileData.hasNext() == true) {
    // もしスライドがないならoutput directoryに新規作成する。
    fileData.next().setTrashed(true);
  }

  var drive_slide = DriveApp.getFileById(CopyFromFileId);
  var backup_slide_id = drive_slide.makeCopy(CopyToFileName).getId();
  var slide = SlidesApp.openById(backup_slide_id);
}

function _move_slide(FileId, DirId) {
  let folder = DriveApp.getFolderById(DirId);
  let file = DriveApp.getFileById(FileId);
  file.moveTo(folder);
}

/**
 * Generate Each Slide Functions
 */
function _appendDummyPage(PresentationObj) {
  contents = [
    ["separate", "Engineering Community"],
    ["separate", "Evaluation Package DL"],
    ["separate", "FAQ"],
  ];
  contents.forEach(function (content, idx) {
    _appendSlide(PresentationObj, content);
  });
}

function _appendTitlePage(PresentationObj) {
  var d = new Date();
  var year = d.getFullYear();
  var month = d.getMonth() + 1;
  var day = d.getDate();
  var today = year + "-" + month + "-" + day;
  contents = [["title", "Engineering Community Analysis Slides", today]];
  contents.forEach(function (content, idx) {
    _appendSlide(PresentationObj, content);
  });
}

function _appendDownloadPage(PresentationObj) {
  /**
   * ここにスライド追加していく
   */
  contents = [
    ["separate", "Evaluation Package Download"],
    [
      "simple",
      "EVA PKG Donwload",
      "A192:E206#5",
      "A185:F189#8",
      "EvaluationPackageDownloadQuaterPoly",
    ],
  ];
  contents.forEach(function (content, idx) {
    _appendSlide(PresentationObj, content);
  });
}

function _appendRulzPage(PresentationObj) {
  /**
   * ここにスライド追加していく
   */
  contents = [
    ["separate", "Engineering Community(Q&A forum)"],
    ["simple", "RulzMember", "A5:F17#7", "RulzMemberBar", "RulzMemberPoly"],
    [
      "simple",
      "Rulz Q&A Post",
      "A27:F39#7",
      "RulzQ&APostBar",
      "RulzQ&APostPoly",
    ],
    [
      "simple",
      "Rulz Reply Post",
      "A48:F60#7",
      "RulzQ&AReplyBar",
      "RulzQ&AReplyPoly",
    ],
    [
      "simple",
      "Rulz Forum Pageviews",
      "A137:F149#7",
      "RulzForumViewBar",
      "RulzForumViewPoly",
    ],
  ];
  contents.forEach(function (content, idx) {
    _appendSlide(PresentationObj, content);
  });
}

function _appendFAQPage(PresentationObj) {
  /**
   * ここにスライド追加していく
   */
  contents = [
    ["separate", "Renesas knowledge base(FAQ)"],
    ["simple_h", "FAQ Views", "A88:F101#6", "A103:F116#6", "G103:L116#6"],
    [
      "simple_h",
      "FAQ Category Views(total)",
      "A118:C125#6",
      "E118:G125#6",
      "I118:K125#6",
    ],
    //["two_contens", "FAQ Category Views(total)", "A118:C125#6", "FAQTotalCategoryPie"],
    //["four_contens", "FAQ Category Views(total)","E118:G125#6", "FAQJaCategoryPie", "I118:K125#6", "FAQEnCategoryPie"],
    [
      "two_v_contens",
      "FAQ Category Views(total)",
      "A118:C125#6",
      "FAQTotalCategoryViewPie",
    ],
    [
      "two_v_contens",
      "FAQ Category Views(En)",
      "E118:G125#6",
      "FAQEnCategoryViewPie",
    ],
    [
      "two_v_contens",
      "FAQ Category Views(Ja)",
      "I118:K125#6",
      "FAQJaCategoryViewPie",
    ],
    //["four_contens", "FAQ Category Views(total)","E118:G125#6", "FAQJaCategoryPie", "I118:K125#6", "FAQEnCategoryPie"],
  ];
  contents.forEach(function (content, idx) {
    _appendSlide(PresentationObj, content);
  });
}

/**
 * Sub functions for generate each slide
 */
// Append Slide sub function
function _appendSlide(PresentationObj, config_list) {
  var layout = config_list.shift();
  if (layout == "simple")
    _appendSimpleLayoutSlide(PresentationObj, config_list);
  else if (layout == "simple_h")
    _appendHorizontalLayoutSlide(PresentationObj, config_list);
  else if (layout == "two_contens")
    _appendTwoContentLayoutSlide(PresentationObj, config_list);
  else if (layout == "two_v_contens")
    _appendTwoVContentLayoutSlide(PresentationObj, config_list);
  else if (layout == "four_contens")
    _appendFourContentLayoutSlide(PresentationObj, config_list);
  else if (layout == "separate")
    _appendSeparateSlide(PresentationObj, config_list);
  else if (layout == "title") _appendTitleSlide(PresentationObj, config_list);
}

//  Add slide which can be detected slide type
/**
 * +---------------|
 * | title         |
 * +-------+-------+
 * |       | comp2 |
 * | comp1 +-------+
 * |       | comp3 |
 * +---------------+
 */
function _appendSimpleLayoutSlide(PresentationObj, config_list) {
  component_size_list = [
    [30, 80, 360, 200], // 左
    [400, 0, 320, 200], // 右上
    [400, 200, 320, 200], // 右下
  ];

  title = config_list.shift();
  var slide_obj = PresentationObj.appendSlide();
  slide_obj
    .insertTextBox(title, ...GenerateSlide_config["title_size_list"])
    .getText()
    .getTextStyle()
    .setFontSize(32);

  config_list.forEach(function (next_slide, idx) {
    if (next_slide.match(/:/)) {
      // :を含むならtableの範囲
      table_range = next_slide.split("#")[0];
      font_size = next_slide.split("#")[1];
      _copy_table_from_sheet(
        slide_obj,
        table_range,
        (font_size = font_size),
        (table_size_list = component_size_list[idx])
      );
    } else {
      // それ以外ならchartのtitle
      slide_obj.insertSheetsChartAsImage(
        GenerateSlide_chartsDict[next_slide],
        ...component_size_list[idx]
      );
    }
  });
}

//  Add horizontal layout slide
/**
 * +-------------------------+
 * | title                   |
 * +-------+--------+--------+
 * |       |        |        |
 * | comp1 | comp2  | comp3  |
 * |       |        |        |
 * +-------------------------+
 */
function _appendHorizontalLayoutSlide(PresentationObj, config_list) {
  component_size_list = [
    [30, 80, 220, 320],
    [260, 80, 220, 320],
    [490, 80, 220, 320],
  ];
  title = config_list.shift();
  var slide_obj = PresentationObj.appendSlide();
  slide_obj
    .insertTextBox(title, ...GenerateSlide_config["title_size_list"])
    .getText()
    .getTextStyle()
    .setFontSize(32);

  config_list.forEach(function (next_slide, idx) {
    if (next_slide.match(/:/)) {
      // :を含むならtableの範囲
      table_range = next_slide.split("#")[0];
      font_size = next_slide.split("#")[1]; // #を付けることでfont sizeを指定可能。
      _copy_table_from_sheet(
        slide_obj,
        table_range,
        (font_size = font_size),
        (table_size_list = component_size_list[idx])
      );
    } else {
      // それ以外ならchartのtitle
      slide_obj.insertSheetsChartAsImage(
        GenerateSlide_chartsDict[next_slide],
        ...component_size_list[idx]
      );
    }
  });
}

//  Add 4 content layout
/**
 * +---------------+
 * | title         |
 * +-------+-------+
 * | comp1 | comp2 |
 * +-------+-------|
 * | comp3 | comp4 |
 * +---------------+
 */
function _appendFourContentLayoutSlide(PresentationObj, config_list) {
  component_size_list = [
    [30, 80, 320, 180], // 左上
    [400, 80, 320, 180], // 右上
    [30, 200, 320, 180], // 左下
    [400, 200, 320, 180], // 右下
  ];
  title = config_list.shift();
  var slide_obj = PresentationObj.appendSlide();
  slide_obj
    .insertTextBox(title, ...GenerateSlide_config["title_size_list"])
    .getText()
    .getTextStyle()
    .setFontSize(32);

  config_list.forEach(function (next_slide, idx) {
    if (next_slide.match(/:/)) {
      // :を含むならtableの範囲
      table_range = next_slide.split("#")[0];
      font_size = next_slide.split("#")[1]; // #を付けることでfont sizeを指定可能。
      _copy_table_from_sheet(
        slide_obj,
        table_range,
        (font_size = font_size),
        (table_size_list = component_size_list[idx])
      );
    } else {
      // それ以外ならchartのtitle
      slide_obj.insertSheetsChartAsImage(
        GenerateSlide_chartsDict[next_slide],
        ...component_size_list[idx]
      );
    }
  });
}

//  Add 2 horizontal content layout
/**
 * +---------------+
 * | title         |
 * +-------+-------+
 * | comp1 | comp2 |
 * +---------------+
 */
function _appendTwoContentLayoutSlide(PresentationObj, config_list) {
  component_size_list = [
    [30, 80, 320, 360], // 左上
    [400, 80, 320, 360], // 右上
  ];
  title = config_list.shift();
  var slide_obj = PresentationObj.appendSlide();
  slide_obj
    .insertTextBox(title, ...GenerateSlide_config["title_size_list"])
    .getText()
    .getTextStyle()
    .setFontSize(32);

  config_list.forEach(function (next_slide, idx) {
    if (next_slide.match(/:/)) {
      // :を含むならtableの範囲
      table_range = next_slide.split("#")[0];
      font_size = next_slide.split("#")[1]; // #を付けることでfont sizeを指定可能。
      _copy_table_from_sheet(
        slide_obj,
        table_range,
        (font_size = font_size),
        (table_size_list = component_size_list[idx])
      );
    } else {
      // それ以外ならchartのtitle
      slide_obj.insertSheetsChartAsImage(
        GenerateSlide_chartsDict[next_slide],
        ...component_size_list[idx]
      );
    }
  });
}

//  Add 2 vertical content layout
/**
 * +-------+
 * | title |
 * +-------+
 * | comp1 |
 * |       |
 * +-------|
 * | comp2 |
 * +-------+
 */
function _appendTwoVContentLayoutSlide(PresentationObj, config_list) {
  component_size_list = [
    [30, 80, 640, 180], // 左上
    [30, 270, 640, 120], // 右上
  ];
  title = config_list.shift();
  var slide_obj = PresentationObj.appendSlide();
  slide_obj
    .insertTextBox(title, ...GenerateSlide_config["title_size_list"])
    .getText()
    .getTextStyle()
    .setFontSize(32);

  config_list.forEach(function (next_slide, idx) {
    if (next_slide.match(/:/)) {
      // :を含むならtableの範囲
      table_range = next_slide.split("#")[0];
      font_size = next_slide.split("#")[1]; // #を付けることでfont sizeを指定可能。
      _copy_table_from_sheet(
        slide_obj,
        table_range,
        (font_size = font_size),
        (table_size_list = component_size_list[idx])
      );
    } else {
      // それ以外ならchartのtitle
      slide_obj.insertSheetsChartAsImage(
        GenerateSlide_chartsDict[next_slide],
        ...component_size_list[idx]
      );
    }
  });
}

// Separate slide
/**
 * +-------+
 * | title |
 * +-------+
 */
function _appendSeparateSlide(PresentationObj, config_list) {
  component_size_list = [350, 200, 0, 200];
  font_size = 38;
  title = config_list.shift();
  component_size_list[0] -= (font_size / 2) * (title.length / 2);
  component_size_list[1] -= font_size / 2;
  component_size_list[2] = (font_size / 2) * 1.1 * title.length;
  component_size_list[3] = font_size + 1;
  var slide_obj = PresentationObj.appendSlide();
  slide_obj
    .insertTextBox(title, ...component_size_list)
    .getText()
    .getTextStyle()
    .setFontSize(font_size);
}

// Title slide
/**
 * +---------+
 * | title   |
 * | SubText |
 * +---------+
 */
function _appendTitleSlide(PresentationObj, config_list) {
  component_size_list_base = [350, 200, 0, 200]; // slide center pos
  component_size_list = [];
  font_size = 38;
  var slide_obj = PresentationObj.appendSlide();
  // title
  title = config_list.shift();
  component_size_list[0] =
    component_size_list_base[0] - (font_size / 2) * (title.length / 2);
  component_size_list[1] = component_size_list_base[1] - font_size / 2;
  component_size_list[2] = (font_size / 2) * 1.1 * title.length;
  component_size_list[3] = font_size + 1;
  slide_obj
    .insertTextBox(title, ...component_size_list)
    .getText()
    .getTextStyle()
    .setFontSize(font_size);
  // Sub text
  sub_text = config_list.shift();
  component_size_list[0] =
    component_size_list_base[0] - (font_size / 2) * (sub_text.length / 2);
  component_size_list[1] =
    component_size_list_base[1] - font_size / 2 + title.length;
  component_size_list[2] = (font_size / 2) * 1.1 * sub_text.length;
  component_size_list[3] = font_size + 1;
  slide_obj
    .insertTextBox(sub_text, ...component_size_list)
    .getText()
    .getTextStyle()
    .setFontSize(font_size);
}

/**
 * Other function
 */

// ex.) range_str = 'A1:B3'
function _copy_table_from_sheet(
  slide_obj,
  range_str,
  font_size = 0,
  table_size_list = []
) {
  var range = GenerateSlide_sheet.getRange(range_str);
  var values = range.getDisplayValues();
  var horizontalAlignments = range.getHorizontalAlignments();
  var backgrounds = range.getBackgrounds();
  var fontWeights = range.getFontWeights();
  var rows = values.length;
  var columns = values[0].length;

  // table_size_listが指定されなかった場合は、そのままinsertする。
  if (table_size_list.length != 0)
    var table = slide_obj.insertTable(rows, columns, ...table_size_list);
  else var table = slide_obj.insertTable(rows, columns);
  // table.setLineSpacing(0.1)

  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < columns; c++) {
      var cell = table.getCell(r, c);
      cell.getText().setText(values[r][c]);
      cell.getFill().setSolidFill(backgrounds[r][c]);

      // chnge font size
      if (font_size != 0) {
        var cell_text = cell.getText().asString();
        if (String(cell_text).length == 1)
          // 0文字の時1になる模様。
          cell.getText().setText(" "); // error対策でスペースを入力しておく
        cell.getText().getTextStyle().setFontSize(font_size);
      }
    }
  }
}
