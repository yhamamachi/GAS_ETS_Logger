/**
 * Dependencies
 *   Parser: 1Mc8BthYthXx6CoIz90-JiSzSafVnT6U3t0z_W3hLTAX5ek4w0G_EIrNw
 *   common.gsへの依存は無し。
*/

/**
 * Global Variable
 */

forum_config = {
  en: {
    toppage_url: "https://community.renesas.com/",
    forum_list_url: "https://community.renesas.com/automotive/gateway/f",
    question_per_page: 20,
    target_forum_url: "https://community.renesas.com/automotive/gateway/f/forum",
    target_group: "R-Car S4 (Gateway)",
    target_sheet_name: "RulzQA",
  },
  ja: {}, // ForumのJP版は存在しない
}

/**
 * Trigger Function
 */
function GetQAinfoFromWebPage(_forum_config=forum_config) {
  TAG_LIST = [ "SK-", "KF-", "3-" ]
  sheet_headers = [ 'URL', 'RAW_TAG', 'TAG', 'AUTHOR', "OPEN_DATE"]
  const forum_url = _forum_config["en"]["target_forum_url"];

  const discussion_count = _GetForumQuestionCountFromForumListPage(forum_config)
  let html = UrlFetchApp.fetch(forum_url).getContentText();
  from_str = 'data-pagekey="'
  url_base = forum_url + '?' +
    Parser.data(html).from(from_str).to('"').build() + "="
  //url_base = forum_url + '?' +
  //  Parser.data(html).from(from_str).to('" class="next"').build().replace("=2", "=")

  page_num = 1 + Math.floor(discussion_count / forum_config["en"]["question_per_page"])
  console.log(discussion_count, page_num)

  let urls = [];
  for (i=1; i<=page_num; i++) {
    let url = url_base + i
    let html = UrlFetchApp.fetch(url).getContentText();
    console.log("Get URLs: ", i, "/", page_num)
    // views Q&A link(split block with h2 tag)
    from_str = '<h2>'; to_str = '</h2>'
    blocks = Parser.data(html).from(from_str).to(to_str).iterate()
    loop = blocks.length
    for(n=0; n<loop; n++) {
      urls.push( blocks[n].split('"')[1] )
    }
  }

  /** 各QAの情報を取得 -> data_listへ格納 */
  data_list = []
  data_list.push(sheet_headers)
  url_counter = 1
  urls.forEach(function(url){
    console.log("Get TAGs: ", url_counter, "/", urls.length); url_counter += 1
    let html = UrlFetchApp.fetch(url).getContentText();
    // Category(TAG)
    from_str = 'keywords" content="'; to_str = '" />'
    categories = Parser.data(html).from(from_str).to(to_str).build()
    // Author
    from_str = 'class="internal-link view-user-profile">'; to_str = '</a>'
    author = Parser.data(html).from(from_str).to(to_str).build()
    author = author.replace(/ /g,"").replace(/	/g,"").replace(/[\r\n]+/g, ""); // 空白、改行の削除
    // OpenDate
    from_str = 'data-dateutc="'; to_str = 'T'
    open_date = Parser.data(html).from(from_str).to(to_str).build()
    // TAG(処理結果)
    tag = "No-TAG"
    categories_list = categories.split(', ')
    /* Gen4ではTAGはひとまず扱わない予定
    for (c=0; c<categories_list.length; ++c) {
      for (t=0; t<TAG_LIST.length; ++t) {
        if ( categories_list[c].indexOf(forum_config["en"]["toppage_url"]) != -1) {
          break;
        }
        else if (categories_list[c].indexOf(TAG_LIST[t]) != -1) {
          tag = categories_list[c];
          break;
        }
      }
    }
    */
    data_list.push([url, categories, tag, author, open_date]);
  })
  /** Sheetに転記 */
  sheet_name = _forum_config["en"]["target_sheet_name"]
  const mySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheet_name)
  mySheet.clear();
  mySheet.getRange(1, 1, data_list.length, data_list[0].length).setValues(data_list)
}

// ==================================================================
// その他関数
// ==================================================================
/*
 * _GetForumQuestionCountFromForumListPage()
 *   Description: Get Question count of specific forum.
 */
function _GetForumQuestionCountFromForumListPage(_forum_config=forum_config) {
  // For debug
  //forum_list_url = "https://community.renesas.com/automotive/r-car-h3-m3-cockpit/f";
  
  let question_count = -1;
  let html = UrlFetchApp.fetch(_forum_config["en"]["forum_list_url"]).getContentText();
  _forum_list = Parser.data(html).from('<li class="content-item with-href"').to('<div class="minimal cell nowrap latest metadata">').iterate()
  _forum_list.forEach(function(forum){
    forum_link = Parser.data(forum).from('data-href="').to('">').build()
    console.log(forum_link)
    if (forum_link == _forum_config["en"]["target_forum_url"] ){
      question_count = Parser.data(forum).from('<span class="value">').to('</span>').build();
    }
  })
  console.log(question_count)
  return question_count;
}

/*
 * RulzScrape_GetMemberFromWebPage()
 *   Description: Get Group member count.
 */
function RulzScrape_GetMemberFromWebPage(_forum_config=forum_config) {
  url = _forum_config["en"]["toppage_url"] + "/automotive/subgrouplist"
  let member = -1

  let html = UrlFetchApp.fetch(url).getContentText();
  const search_str_start = _forum_config["en"]["target_group"] // for member count
  const search_str_end = 'members' // for member count
  let _member = Parser.data(html).from(search_str_start).to(search_str_end).build() // extract required block
  _member = Parser.data(_member).from("ago</time><br />").to(" ").build() // extract member count
  member = parseInt(_member) // convert to integer
  console.log(member);
  return member;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
