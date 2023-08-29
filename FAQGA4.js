/** 参考リンク:
 * 手順: https://swfz.hatenablog.com/entry/2021/09/26/045444?utm_source=feed
 * GA4 API: https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
*/

/**
 * ToDo memo
 *   表をいい感じに成型したい。今のは見づら過ぎる。
 */

FAQGA4_config = {
  en: {
    propertyId: 266550516,
    category_num: 31891,
    start_year: 2023,
    start_month: 1, // 3月から稼働開始。3~7月はデータが取れない or 欠損している模様。
    sheet_name: "FAQen",
    lang: "en",
  },
  ja: {
    propertyId: 266558397,
    category_num: 31892,
    start_year: 2023,
    start_month: 1,
    sheet_name: "FAQja",
    lang: "ja",
  },
  other: {
    ranking_sheet_name: "FAQrank",
    ranking_sheet_header: ["UniqueID", "Period", "Total views", "1st", "2nd", "3rd"],
  }
}
/**
 * Trigger呼び出し関数
 */
function FAQ_ranking(sheet_name=FAQGA4_config["other"]["ranking_sheet_name"]) {
  ["en", "ja"].forEach(function(lang){
    // 四半期
    FAQ_insertRecords(sheet_name, FAQ_getFAQRanking(lang, FAQ_get_quaterly_date_list(lang)))
    // 半期
    FAQ_insertRecords(sheet_name, FAQ_getFAQRanking(lang, FAQ_get_half_year_date_list(lang)))
    // 年間
    FAQ_insertRecords(sheet_name, FAQ_getFAQRanking(lang, FAQ_get_year_date_list(lang)))
  })
  // header部の挿入
  FAQ_insertRecords(sheet_name, [FAQGA4_config["other"]["ranking_sheet_header"]])
  // A列の内容がかぶったら後ろの行のデータ(古いほう)を消す
  FAQ_duplicate_remover(sheet_name)
}

function FAQ_Logger() {
  ["en", "ja"].forEach(function(lang){
      FAQ_insertRecords(FAQGA4_config[lang]["sheet_name"], FAQ_getFAQViewData(lang))
      FAQ_duplicate_remover(FAQGA4_config[lang]["sheet_name"]) // A列の内容がかぶったら後ろの行のデータ(古いほう)を消す
    })
}

/**
 * OTher function 要整理
 */
//======================================================================
function FAQ_insertRecords(mySheetName, values){
  const mySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(mySheetName)
  const numRows = values.length;
  const numColumns = values[0].length;
  const row_offset = 1 // 1行目はスキップする。
  mySheet.insertRows(row_offset,numRows);
  mySheet.getRange(row_offset, 1, numRows, numColumns).setValues(values);
}

function FAQ_getFAQList(lang="en") {
  // faqs = { all: {}, category: {{}}}
  api_getSubCategoryFromCategoryID = "https://"+lang+"-support.renesas.com/api/KnowledgeBase/GetCategoryContent?categoryID="
  api_getFaqFromSubCategoryID = "https://"+lang+"-support.renesas.com/api/KnowledgeBase/GetSubCategoryContent?subcategoryID="

  let html = UrlFetchApp.fetch(api_getSubCategoryFromCategoryID + FAQGA4_config[lang]['category_num']).getContentText();
  _subcategories = JSON.parse(html)['SubCategories']
  SubCategoryIDs = []
  SubCategoryNames = []
  for (i =0; i< _subcategories.length; ++i) {
    SubCategoryIDs.push(_subcategories[i]['CategoryID'] )
    SubCategoryNames.push(_subcategories[i]['CategoryName'])
  }

  faqURLs = []
  faqs = {"all": [], "category":{},}
  for (loop=0; loop< SubCategoryIDs.length; ++loop) {
    let html = UrlFetchApp.fetch(api_getFaqFromSubCategoryID + SubCategoryIDs[loop]).getContentText();
    _faqs = JSON.parse(html)['Articles']
    _faq_list = []
    for (n=0; n<_faqs.length;++n){
      _url = "https://"+lang+"-support.renesas.com/knowledgeBase/" + _faqs[n]['ArticleID']
      faqURLs.push(_url)
      _faq_list.push(_url)
    }
    faqs["category"][SubCategoryNames[loop]] = _faq_list
  }
  faqs["all"] = faqURLs;

  return faqs;
}

function FAQ_getFAQViewData(lang="en") {
  let _header = ["date", "count"]
  faqs = FAQ_getFAQList(lang)
  _header.push(...Object.keys(faqs["category"]))

  today = new Date();
  loop_num = (today.getFullYear() - FAQGA4_config[lang]['start_year'])*12 + (today.getMonth() - FAQGA4_config[lang]['start_month'] + 1)

  console.log(Object.keys(faqs["category"]).length)

  let data_list = []
  for (month=0;month<=loop_num; month++) {
    _month = (month + FAQGA4_config[lang]['start_month'] - 1) % 12 + 1;
    _year = FAQGA4_config[lang]['start_year'] + Math.floor(((month + FAQGA4_config[lang]['start_month']-1))/12)
    console.log(FAQ_getLastMonthDateRangeFromDate(_year, _month))
    _FAQ_CAT_DATA = []
    for (f_cnt=0; f_cnt<Object.keys(faqs["category"]).length; ++f_cnt) {
      ret = FAQ_getFAQReportFromGA4(propertyId=FAQGA4_config[lang]['propertyId'], 
        URLlist=faqs["category"][Object.keys(faqs["category"])[f_cnt]],
        dateRange=FAQ_getMonthDateRangeFromDate(_year, _month) )
      count = 0
      try{
        ret = ret['rows']
        for(i=0; i < ret.length; i++) {
            count += Number(ret[i]['metricValues'][0]['value'])
        }
      }catch {
        console.log("error")
      }
      _FAQ_CAT_DATA.push(count)
    }
    total = _FAQ_CAT_DATA.reduce(function(sum, element){
      return sum + element;
    }, 0);
    try {
      data_list.unshift([_year+"-"+_month, total, ..._FAQ_CAT_DATA]) // push: 末尾, unshift: 先頭
    } catch {
      console.log("year=" + _year + " month="+_month+": error")
    }
  }
  //data_list.unshift() // Header
  data_list.unshift( _header )
  console.log(data_list)
  return data_list
}

//======================================================================
function FAQ_getFAQRanking(lang="en", date_period_list) {
  const _header = FAQGA4_config["other"]["ranking_sheet_header"]
  api_getArticleFromID = "https://"+lang+"-support.renesas.com/api/KnowledgeBase/GetKnowledgeBaseArticle?searchText=&kbid="
  
  faqs = FAQ_getFAQList(lang)
  faqURLs = faqs["all"]
  
  let data_list = []
  date_period_list.forEach (function (date_range) {
    ret = FAQ_getFAQReportFromGA4(propertyId=FAQGA4_config[lang]['propertyId'], URLlist=faqURLs, dateRange=date_range )
    ret = ret['rows']
    count = 0
    try {
      _FAQ_RANKING_urls = []
      _FAQ_RANKING_views = []
      _FAQ_RANKING_titles = []
      for(i=0; i < ret.length; i++) {
          if( i < 3 ) { // TOP 3 FAQの抽出
            _FAQ_RANKING_urls.push(ret[i]['dimensionValues'][0]['value'] )
            _FAQ_RANKING_views.push(ret[i]['metricValues'][0]['value'])
            // Get title from API
            _article_id = ret[i]['dimensionValues'][0]['value'].replace("https://"+lang+"-support.renesas.com/knowledgeBase/", "")
            console.log(api_getArticleFromID+_article_id)
            let _html = UrlFetchApp.fetch(api_getArticleFromID+_article_id).getContentText();
            let title = JSON.parse(_html)['Article']['Name']
            console.log(title)
            _FAQ_RANKING_titles.push(title)
          }
          // console.log(ret[i]);
          count += Number(ret[i]['metricValues'][0]['value'])
      }
      // console.log("year=" + _year + " month="+_month+": " + count)
      _period = date_range['startDate']+"-"+date_range['endDate']
      data_list.unshift(["Views "+lang+" "+_period, _period, count, ..._FAQ_RANKING_views]) // push: 末尾, unshift: 先頭
      data_list.unshift(["URL "+lang+" "+_period, _period, count, ..._FAQ_RANKING_urls]) // push: 末尾, unshift: 先頭
      data_list.unshift(["Title "+lang+" "+_period, _period, count, ..._FAQ_RANKING_titles]) // push: 末尾, unshift: 先頭
      data_list.unshift(["space "+lang+" "+_period, " ", " ", " ", " ", " "])
    } catch {
      console.log(date_range['startDate']+"-"+date_range['endDate']+": error")
    }
  })
  data_list.unshift() // Header
  console.log(data_list)
  return data_list
}
//======================================================================

function FAQ_getFAQReportFromGA4(propertyId=FAQGA4_config['en']['propertyId'], URLlist=["https://en-support.renesas.com/knowledgeBase/20307725"], dateRange={ startDate: 2022-01-01, endDate: 2022-01-31}) {
  // const metric = {name: 'eventCount'};
  //const metric = {name: 'eventCount', expression: "ga:pageviews"};
  const metric = [{name: 'screenPageViews'}]; // page_viewの代わりらしい
  //const dimension = [{name: 'date'}, {name: 'pagePath'}]
  //const dimension = [{name: 'pagePath'}] // クエリもドメインもないsimpleなpath
  const dimension = [{name: 'pageLocation'}]　// full path
  //const dimension = {name: 'month'}
  //const dimension = {name: 'pagePathPlusQueryString'} // domainを除いたフルパス

  const dimensionFilter = {
    filter: {
      fieldName: "pageLocation",
      inListFilter: {
        values: URLlist,
      }
    }
  }

  const request = {
    dimensions: dimension,
    metrics: metric,
    dateRanges: dateRange,
    dimensionFilter: dimensionFilter,
  }

  return AnalyticsData.Properties.runReport(request, `properties/${propertyId}`);
}

/**
 * どこのページからアクセスしてきたか解析用の関数
 */
// en版/knowledgeBase/20933823は、How can I check the version of R-Car S4 Whitebox SDK written to R-Car S4 Reference Board/Spider?。
function FAQ_getAccessDomainFromGA4(propertyId=FAQGA4_config['en']['propertyId'],
  URLlist=["https://en-support.renesas.com/knowledgeBase/20933823"],
  dateRange={ startDate: "2023-01-01", endDate: "2023-07-31"}) 
{
  var debug_flag = (URLlist.length == 1) ? 1 : 0; // condition ? true : false
  var metric = [{name: 'screenPageViews'}]; // page_viewの代わりらしい
  //var metric = [{name: 'activeUsers'}]; // アクティブユーザーもあるらしい
  var dimension = [{name: 'landingPage'}, {name: 'pageReferrer'}]

  const dimensionFilter = {
    filter: {
      fieldName: "landingPage",
      inListFilter: {
        // http ~ domain/までを削除する pythonでは arr[3:]に該当する操作。
        // https://en-support.renesas.com/knowledgeBase/20134171 -> [0]=https: [1]= [2]=en-support.renesas.com [3]=knowledgeBase [4]=20134171のはず。
        values: URLlist.map(element => "/"+element.split('/').slice(3).join("/")), 
      }
    }
  }

  const request = {
    dimensions: dimension,
    metrics: metric,
    dateRanges: dateRange,
    dimensionFilter: dimensionFilter,
  }

  ret = AnalyticsData.Properties.runReport(request, `properties/${propertyId}`)
  ret = ret['rows']

  result_hash_array = {}; // {domain1: count, domain2, count, ...}とする予定
  for(i=0; i < ret.length; i++) {
    page_views = ret[i]['metricValues'][0]['value']
    landing_page = ret[i]['dimensionValues'][0]['value']
    access_from_page = ret[i]['dimensionValues'][1]['value']
    access_from_domain = access_from_page.split('/')[2]
    // console.log(page_views, " views, Access to", landing_page, " : from ", access_from_domain)

     // 集計を試みる。
     if (result_hash_array[access_from_domain] == undefined)
      result_hash_array[access_from_domain] = 0;
    result_hash_array[access_from_domain] += Number(page_views)
  }
  if (debug_flag) console.log(result_hash_array)
  return result_hash_array;
} 
//======================================================================

// ========================
// Common func
// ========================
function FAQ_getMonthDateRangeFromDate(year=2022, month=1) { // (2022,1) => return { startDate: 2021-1-1, endDate: 2021-1-31}
  _endDate = new Date(year, month, 0);
  _startDate = new Date(year, month-1, 1);
  endDate = _endDate.getFullYear() +"-"+(1+_endDate.getMonth())+"-"+_endDate.getDate()
  startDate = _startDate.getFullYear() +"-"+(1+_startDate.getMonth())+"-"+_startDate.getDate()
  //console.log(startDate,endDate)
  return {startDate: startDate, endDate: endDate}
}
function FAQ_getLastMonthDateRangeFromDate(year=2022, month=1) { // (2022, 1) -> { startDate: 2021-12-01, endDate: 2021-12-31}
  const d = new Date(year, month-1, 0);
  return FAQ_getMonthDateRangeFromDate(d.getFullYear(), 1+d.getMonth())
}
function FAQ_getLastMonthDateRange() { // () -> return { startDate: yyyy-mm-dd, endDate: yyyy-mm-dd}
  const d = new Date();
  return FAQ_getLastMonthDateRangeFromDate(d.getFullYear(), 1+d.getMonth())
}

function FAQ_get_monthly_date_list(lang="en") {
  date_list = []
  start_year = FAQGA4_config[lang]['start_year']
  today = new Date();
  current_year = today.getFullYear()
  loop_year = (current_year-start_year+1)
  loop_month = (12/1)
  for (loop_y=0; loop_y<loop_year; ++loop_y) {
    for (loop_m=0; loop_m<loop_month; ++loop_m) {
      _dict = FAQ_getMonthDateRangeFromDate(start_year+loop_y, loop_m+1)
      date_list.push(_dict)
    }
  }
  console.log(date_list)
  return date_list
}

function FAQ_get_quaterly_date_list(lang="en") {
  date_list = []
  start_year = FAQGA4_config[lang]['start_year']
  today = new Date();
  current_year = today.getFullYear()
  loop_year = (current_year-start_year+1)
  loop_month = (12/3)
  for (loop_y=0; loop_y<loop_year; ++loop_y) {
    for (loop_m=0; loop_m<loop_month; ++loop_m) {
      _dict_s = FAQ_getMonthDateRangeFromDate(start_year+loop_y, 3*loop_m+1)
      _dict_e = FAQ_getMonthDateRangeFromDate(start_year+loop_y, 3*loop_m+3)
      _dict = {
        "startDate": _dict_s['startDate'],
        "endDate": _dict_e['endDate'],
      }
      date_list.push(_dict)
    }
  }
  console.log(date_list)
  return date_list
}

function FAQ_get_half_year_date_list(lang="en") {
  date_list = []
  start_year = FAQGA4_config[lang]['start_year']
  today = new Date();
  current_year = today.getFullYear()
  loop_year = (current_year-start_year+1)
  loop_month = (12/6)
  for (loop_y=0; loop_y<loop_year; ++loop_y) {
    for (loop_m=0; loop_m<loop_month; ++loop_m) {
      _dict = {
        "startDate": start_year+loop_y + "-"+(1+6*loop_m).toString()+"-1",
        "endDate": start_year+loop_y + "-"+(6+6*loop_m).toString()+"-"+(30+loop_m).toString(),
      }
      date_list.push(_dict)
    }
  }
  console.log(date_list)
  return date_list
}

function FAQ_get_year_date_list(lang="en") {
  date_list = []
  start_year = FAQGA4_config[lang]['start_year']
  today = new Date();
  current_year = today.getFullYear()
  loop_year = (current_year-start_year+1)
  for (loop_y=0; loop_y<loop_year; ++loop_y) {
    _dict = {
      "startDate": start_year+loop_y + "-1-1",
      "endDate": start_year+loop_y + "-12-31",
    }
    date_list.push(_dict)
  }
  console.log(date_list)
  return date_list
}

// A列を見てかぶっていたら後に出てきたほうを削除する。
function FAQ_duplicate_remover(sheet_name) {
  const mySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheet_name);
  const maxrow = mySheet.getLastRow();
  const maxcol = mySheet.getLastColumn();

  const cells = mySheet.getRange(1,1,maxrow, maxcol)
  cells.removeDuplicates([1]); // 1=A列, 2=B列
  return
}
