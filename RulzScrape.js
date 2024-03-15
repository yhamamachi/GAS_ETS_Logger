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
    scrape_sheet_name: "RulzForum",
    reply_sheet_name: "RulzReply",
  },
  ja: {}, // ForumのJP版は存在しない
}

/**
 * Trigger Function
 */
function RulzScrape_GetQAinfoFromWebPage(_forum_config=forum_config) {
  TAG_LIST = [ "SK-", "KF-", "3-" ]
  sheet_headers = [ 'URL', 'RAW_TAG', 'TAG', 'AUTHOR', "OPEN_DATE"]
  const forum_url = _forum_config["en"]["target_forum_url"];
  const urls = RulzScrape_GetDiscussionList(_forum_config)

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

function RulzScrape_GetForumData_Daily(_forum_config=forum_config) {
  const date = RulzScrape_GetDate()
  const member = RulzScrape_GetMemberFromWebPage(_forum_config)
  const discussion_count = RulzScrape_GetForumQuestionCountFromForumListPage(_forum_config)
  const closed_count = RulzScrape_GetClosedDiscussion(_forum_config)
  const closed_ratio = Math.floor(100*closed_count/discussion_count) + "%"
  const replies = RulzScrape_GetRepliesCount(_forum_config)
  const views = 0 // placeholder
  
  const data_list = [
    ["date", "Member Count", "Discussion Count", "Closed Count", "Closed ratio", "replies", "views"],
    [date, member, discussion_count, closed_count, closed_ratio, replies, views],
  ]


  /** Sheetに転記 */
  sheet_name = _forum_config["en"]["scrape_sheet_name"]
  RulzScrape_insertRecords(sheet_name, data_list)
}

function RulzScrape_GetReplyData_Daily(_forum_config=forum_config) {
  const forum_url = _forum_config["en"]["target_forum_url"];
  const urls = RulzScrape_GetDiscussionList(_forum_config)
  sheet_headers = [ 'Q&A URL', 'Reply date', 'Author']

  /** 各QAの情報を取得 -> data_listへ格納 */
  data_list = []
  data_list.push(sheet_headers)
  urls.forEach(function(url){
    const qa_json_url = RulzScrape_GetJsonLinkFromURL(url)
    var _data = RulzScrape__GetReplyInfoFromJson(qa_json_url);

    for (let n=0; n<_data.length; ++n) {
      var _insert_data = [url, ..._data[n]]
      data_list.push(_insert_data)
    }
  });

  /** Sheetに転記 */
  sheet_name = _forum_config["en"]["reply_sheet_name"]
  RulzScrape_updateSheet(sheet_name, data_list)
}

// ==================================================================
// その他関数
// ==================================================================
/*
 * RulzScrape_GetForumQuestionCountFromForumListPage()
 *   Description: Get Question count of specific forum.
 */
function RulzScrape_GetForumQuestionCountFromForumListPage(_forum_config=forum_config) {
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

/*
 * RulzScrape_GetDiscussionList()
 *   Description: Get posted discussion(Q&A) count from forum page.
 */
function RulzScrape_GetDiscussionList(_forum_config=forum_config) {
  const discussion_count = RulzScrape_GetForumQuestionCountFromForumListPage(forum_config)
  const forum_url = _forum_config["en"]["target_forum_url"]
  let html = UrlFetchApp.fetch(forum_url).getContentText();
  from_str = 'data-pagekey="'
  url_base = forum_url + '?' +
    Parser.data(html).from(from_str).to('"').build() + "="

  page_num = Math.ceil(discussion_count / _forum_config["en"]["question_per_page"])
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
  console.log(urls)
  return urls
}

/*
 * RulzScrape_GetClosedDiscussion()
 *   Description: Get closed discussion(Q&A) count from forum page.
 */
function RulzScrape_GetClosedDiscussion(_forum_config=forum_config) {
  const forum_url = _forum_config['en']["target_forum_url"]
  const question_per_page = _forum_config["en"]["question_per_page"]
  const discussion_count = RulzScrape_GetForumQuestionCountFromForumListPage(_forum_config)
  const page_num = Math.ceil(discussion_count / question_per_page)

  let html = UrlFetchApp.fetch(forum_url).getContentText();
  from_str = '"'+forum_url.replace(_forum_config['en']["toppage_url"],"") + '?'
  url_base = forum_url + '?' +
    Parser.data(html).from(from_str).to('"').build() + "="
  if (page_num == 1) url_base = forum_url + "?dummy="

  let closed = 0
  for (i=1; i<=page_num; i++) {
    let url = url_base + i
    let html = UrlFetchApp.fetch(url).getContentText();

    // discussion info
    from_str = 'data-answertype="verified-answers"'
    to_str = '</span>'
    closed += Parser.data(html).from(from_str).to(to_str).iterate().length
  }
  console.log(closed)
  return closed
}

/*
 * RulzScrape_GetRepliesCount()
 *   Description: Get replies count from forum page.
 */
function RulzScrape_GetRepliesCount(_forum_config=forum_config) {
  const forum_url = _forum_config['en']["target_forum_url"]
  const question_per_page = _forum_config["en"]["question_per_page"]
  const discussion_count = RulzScrape_GetForumQuestionCountFromForumListPage(_forum_config)
  const page_num = Math.ceil(discussion_count / question_per_page)

  let html = UrlFetchApp.fetch(forum_url).getContentText();
  from_str = '"'+forum_url.replace(_forum_config['en']["toppage_url"],"") + '?'
  url_base = forum_url + '?' +
    Parser.data(html).from(from_str).to('"').build() + "="
  if (page_num == 1) url_base = forum_url + "?dummy="

  let replies = 0
  for (i=1; i<=page_num; i++) {
    let url = url_base + i
    let html = UrlFetchApp.fetch(url).getContentText();

    // views replies
    from_str = '<span class="value">'
    to_str = '</span>'
    values = Parser.data(html).from(from_str).to(to_str).iterate()
    loop = values.length / 3
    for(n=0; n<loop; n++) {
      replies += Number(values[n*3+1])
    }
  }
  console.log(replies)
  return replies
}

function RulzScrape_GetDate() {
  const date = new Date();
  var date_D = new Date(date.getFullYear(),date.getMonth(),date.getDate(),0,0,0); //日付を取り出す
  date_D = Utilities.formatDate(date, "JST", "yyyy/MM/dd")
  console.log(date_D);
  return date_D
}

function RulzScrape_insertRecords(mySheetName, values){
  const mySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(mySheetName)
  const numRows = values.length;
  const numColumns = values[1].length;
  const row_offset = 1 // When skip first row, start 2.
  mySheet.insertRows(row_offset,numRows);
  mySheet.getRange(row_offset, 1, numRows, numColumns).setValues(values);

  /** Remove duplicated row */
  const maxrow = mySheet.getLastRow();
  const maxcol = mySheet.getLastColumn();
  const cells = mySheet.getRange(1,1,maxrow, maxcol)
  cells.removeDuplicates([1]); // 1=A row, 2=B row
}

/**
 * RulzScrape_updateSheet(mySheetName, values)
 *   Delete all contents on 'mySheetName', then write 'values'.
 */
function RulzScrape_updateSheet(mySheetName, values){
  const mySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(mySheetName)
  mySheet.clear();
  const numRows = values.length;
  const numColumns = values[1].length;
  const row_offset = 1 // When skip first row, start 2.
  mySheet.insertRows(row_offset,numRows);
  mySheet.getRange(row_offset, 1, numRows, numColumns).setValues(values);
}


function RulzScrape_GetJsonLinkFromURL(url) {
  let html = UrlFetchApp.fetch(url).getContentText();
  // listRepliesUrl
  from_str = "listRepliesUrl: '"; to_str = "',"
  url_base = Parser.data(html).from(from_str).to(to_str).build().replace(/\\u0026/g,"&")
  // forumId
  from_str = "forumId: "; to_str = " ,"
  forumId = Parser.data(html).from(from_str).to(to_str).build()
  // threadId
  from_str = "threadId: "; to_str = " }"
  threadId = Parser.data(html).from(from_str).to(to_str).build()

  // Generate URL
  json_url = url_base + "&_w_forumId=" + forumId + "&_w_threadId=" + threadId
  console.log(json_url)

  return json_url;
}

function RulzScrape__GetReplyInfoFromJson(json_url) {
  console.log(json_url)
  let html = UrlFetchApp.fetch(json_url).getContentText();

  from_str = '0px\\" alt=\\"'; to_str = '\\" '
  authors = Parser.data(html).from(from_str).to(to_str).iterate()
  console.log(authors)

  from_str = 'createdDate":  "'; to_str = 'T'
  createDates = Parser.data(html).from(from_str).to(to_str).iterate()
  console.log(createDates)

  let data_list = []
  for (let i=0; i<authors.length; i++){
    if ( createDates[i].trim() !== '' && authors[i].trim() !== '') {
      data_list.push([createDates[i], authors[i]])
    }
  }

  // Check remain replies
  from_str = 'NextSiblingCount":  '; to_str = ' ,'
  remain_replies = Parser.data(html).from(from_str).to(to_str).iterate().slice(-1)[0]
  console.log(remain_replies)
  if( isNaN(remain_replies) == false && remain_replies != 0) {
    // Get Last replay's Id
    from_str = '"id": "'; to_str = '",'
    last_reply_id = Parser.data(html).from(from_str).to(to_str).iterate().slice(-1)[0]
    console.log("last_reply_id:", last_reply_id)
    const new_json_url = json_url + "&_w_flattenedDepth=0&_w_startReplyId=" + last_reply_id
    const tmp_data_list = _GetReplyInfoFromJson(new_json_url)
    data_list.push(...tmp_data_list)
  }
  console.log()
  return data_list;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
