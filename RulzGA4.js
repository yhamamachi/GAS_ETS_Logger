/**
 * 参考リンク:
 * 手順: https://swfz.hatenablog.com/entry/2021/09/26/045444?utm_source=feed
 * GA4 API: https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
*/
/**
 * 1ファイルで完結するようにリファクタ > 済み
 */


rulz_config = {
  en: {
    propertyId: 267468588,
    start_year: 2023, // 本来の開始は2021/06だが、2022年3月以降しかデータ取得できず。
    start_month: 6,   // また、2022年3月のデータはおかしいので4月以降のデータを取得することとする。
    sheet_name: "RulzGA4",
    lang: "en",
    page_path: "/automotive/gateway/"
  },
  ja: {} // Rulz JPは存在しない
}

/**
 * Trigger Function
 */
function RulzGA4_ReportMonthly() {
  var metric = [{name: 'screenPageViews'}, {name: 'activeUsers'}]; // Pageviews集計用。
  var dateRange = {startDate: '2022-01-01', endDate: '2022-12-31'};
  var dimension = [{name: 'pageLocation'}, {name: 'year'}, {name: 'month'}];

  /** 日付指定で収集開始日～今日までとする。 */
  dateRange["startDate"] = rulz_config['en']["start_year"] + "-" +rulz_config['en']["start_month"] + "-01"
  var date = new Date()
  var today = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() // yyyy-mm-dd
  dateRange["endDate"] = today;
  
  /** URLの中から、関係するものだけをフィルタリングするための設定。 */
  const dimensionFilter = {
    filter: {
      fieldName: "pageLocation",
      stringFilter: {
        matchType: "CONTAINS",
        value: rulz_config.en.page_path,
      }
    }
  }
  /** リクエストするための連想配列。Filterは不要であればコメントアウト可能。 */
  const request = {
    dimensions: dimension,
    metrics: metric,
    dateRanges: dateRange,
    dimensionFilter: dimensionFilter
  }

  /** Google Analyticsにリクエストを投げる。 */
  const propertyId = rulz_config['en']["propertyId"]
  ret = AnalyticsData.Properties.runReport(request, `properties/${propertyId}`);

  /** URLごとにデータが分かれているので、月ごとに集計しなおす。集計のしやすさから、あえて連想配列を使用。 */
  result_hash_array = {};
  result_hash_array_for_active_users = {}
  ret['rows'].forEach(function(row, idx) {
    // console.log(row['dimensionValues'])
    _pageviews = row['metricValues'][0]['value']
    _active_users = row['metricValues'][1]['value']
    // _url = row['dimensionValues'][0]['value'] // Filter時のみ使用。
    _year  = row['dimensionValues'][1]['value']
    _month = row['dimensionValues'][2]['value']

    hash_key = _year+_month 
    if(result_hash_array[hash_key] == undefined)
      result_hash_array[hash_key] = 0
    result_hash_array[hash_key] += Number(_pageviews)

    if(result_hash_array_for_active_users[hash_key] == undefined)
      result_hash_array_for_active_users[hash_key] = 0
    result_hash_array_for_active_users[hash_key] += Number(_active_users)

  })
  console.log(result_hash_array)

  /** 連想配列から配列に直す。また、日付順にソートしなおす。 */
  result_array = [] // ソートして配列に入れなおす。
  Object.keys(result_hash_array).sort().forEach(function (key){
    result_array.unshift( [key, result_hash_array[key], result_hash_array_for_active_users[key] ] ); // push or unshift
  })
  _header = ["Date",	"Pageviews", "ActiveUsers"]
  result_array.unshift(_header)
  console.log(result_array)

  /** シートに反映する。 */
  RulzGA4_insertRecords(rulz_config['en']["sheet_name"], result_array)
  RulzGA4_duplicate_remover(rulz_config['en']["sheet_name"])
  return result_array
} 

/**
 * Other Functions
 */
// シートの2行目に配列を入力するための関数。全体が下にスライドする形。
function RulzGA4_insertRecords(mySheetName, values){
  const mySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(mySheetName)
  const numRows = values.length;
  const numColumns = values[1].length;
  const row_offset = 1 // 1行目をスキップするときは２とする。
  mySheet.insertRows(row_offset,numRows);
  mySheet.getRange(row_offset, 1, numRows, numColumns).setValues(values);
}

// 重複した行を削除するための関数。A列を見てかぶっていたら後に出てきたほうを削除する。
function RulzGA4_duplicate_remover(sheet_name) {
  const mySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheet_name);
  const maxrow = mySheet.getLastRow();
  const maxcol = mySheet.getLastColumn();

  const cells = mySheet.getRange(1,1,maxrow, maxcol)
  cells.removeDuplicates([1]); // 1=A列, 2=B列
  return
}
