// ================================================
// Dependency
// ================================================
/*
  Parser: 1Mc8BthYthXx6CoIz90-JiSzSafVnT6U3t0z_W3hLTAX5ek4w0G_EIrNw
  common.gsへの依存は無し。
*/

// ================================================
// Global variable
// ================================================
var site_domain = "https://community.renesas.com/"
var g_forum_url = "https://community.renesas.com/automotive/gateway/f/forum"
var g_forum_list = "https://community.renesas.com/automotive/gateway/f"
var g_group_name = "R-Car S4 (Gateway)"
var g_sheet_name = "RulzQA"
const g_question_per_page = 20 // 1ページ当たりのQ&Aの表示数。Webの大幅更新がない限りは修正不要。

TAG_LIST = [ "SK-", "KF-", "3-" ]
function GetQAinfoFromWebPage(forum_url=g_forum_url) {


  if(forum_url == "")
    forum_url=g_forum_url;
  if(forum_url != g_forum_url)
    forum_url=g_forum_url;
  const discussion_count = _GetForumQuestionCountFromForumListPage(forum_url)
  let html = UrlFetchApp.fetch(forum_url).getContentText();
  from_str = 'data-pagekey="'
  url_base = forum_url + '?' +
    Parser.data(html).from(from_str).to('"').build() + "="
  //url_base = forum_url + '?' +
  //  Parser.data(html).from(from_str).to('" class="next"').build().replace("=2", "=")

  page_num = 1 + Math.floor(discussion_count / g_question_per_page)
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

  /** 各QAの情報を取得 */
  data_list = []
  data_list.push([ 'URL', 'RAW_TAG', 'TAG', 'AUTHOR', "OPEN_DATE"])
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
        if ( categories_list[c].indexOf(site_domain) != -1) {
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
  const sheet_name = g_sheet_name;
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
function _GetForumQuestionCountFromForumListPage(target_forum_url=g_forum_url, forum_list_url=g_forum_list) {
  // For debug
  //forum_list_url = "https://community.renesas.com/automotive/r-car-h3-m3-cockpit/f";
  
  let question_count = -1;
  let html = UrlFetchApp.fetch(forum_list_url).getContentText();
  _forum_list = Parser.data(html).from('<li class="content-item with-href"').to('<div class="minimal cell nowrap latest metadata">').iterate()
  _forum_list.forEach(function(forum){
    forum_link = Parser.data(forum).from('data-href="').to('">').build()
    console.log(forum_link)
    if (forum_link == target_forum_url ){
      question_count = Parser.data(forum).from('<span class="value">').to('</span>').build();
    }
  })
  console.log(question_count)
  return question_count;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
