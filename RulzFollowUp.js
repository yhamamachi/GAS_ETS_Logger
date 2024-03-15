/**
 * Dependencies
 *   Please set script properties(MAIL_XXXX=xxxxxx@example.com)
 *   This sciprt get address list from properties(MAIL_*), then sends mail according to the list
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
  },
  ja: {}, // ForumのJP版は存在しない
}

/** デバッグ時に使用。メールが飛ばなくなる。手動で書き換えず、__Debug_xxxx functionの使用を推奨 */
var g_debugFlag = false

/**
 * Trigger Function
 */

function RulzFollowUp_RulzSendFollowUpMail(_forum_config=forum_config){
  q_list = RulzFollowUp_GetOpenedQuestions(_forum_config=forum_config)
  mail_subject = "[Rulz Follow up]"+ "今週のRulz状況 for " + _forum_config['en']['target_group'];
  mail_body = RulzFollowUp_GetWhiteboxStatistics(forum_config)
  mail_body += RulzFollowUp_generateMailBody(q_list)
  RulzFollowUp_sendMail(mail_subject, mail_body, g_debugFlag)
}

/**
 * Other Functions
 */
function RulzFollowUp_getAddressListFromProperties(){
    const properties = PropertiesService.getScriptProperties().getProperties();
    addr_list = []
    for(key in properties) {
      if (key.includes("MAIL_")){
        // console.log(key, properties[key])
        addr_list.push(properties[key])
      }
    }
    console.log(addr_list)
    return addr_list
}

function RulzFollowUp_generateMailBody(results) {
  // results =[ [title, url, last_posted_user, last_update], ... ]
  opened_count = results.length
  ret = "現在、未クローズのQ&Aは " + opened_count　+" 件です" + "\n\n"
  results.forEach(function (val, index){
    next_action = "回答が必要です"
    if( val[2].match("Renesas") ){
      next_action = "リプライ待ち or クローズ待ち です"
    }

    // Gen body
    ret += "---------------------------------" + "\n"
    ret += "タイトル　　　：" + val[0] + "\n"
    ret += "リンク　　　　：" + val[1] + "\n"
    ret += "最終更新　　　：" + val[2] +"(" + val[3] + ")" + "\n"
    ret += "次のアクション：" + next_action + "\n"
    ret += "\n"
  })
  console.log(ret)
  return ret;
}

function RulzFollowUp_sendMail(subject, body, debugFlag) {
  const send_list = RulzFollowUp_getAddressListFromProperties()
  var mail_subject = subject; // メールタイトル
  var mail_body = body; // メール本文

  send_list.forEach(function(send_addr, index) {
    if (debugFlag == false)
      // console.log("DEBUG is disabled. Mails are sent")
      MailApp.sendEmail(send_addr, mail_subject, mail_body); // debugするときは、コメントアウトすること
    else
      console.log("DEBUG is enabled. Mails are not sent")
    Logger.log(send_addr + " " + mail_subject + " " + mail_body);
  });
}

/*
 * RulzScrape_GetForumQuestionCountFromForumListPage()
 *   Description: Get Question count of specific forum.
 */
function RulzFollowUp_GetForumQuestionCountFromForumListPage(_forum_config=forum_config) {
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

function RulzFollowUp_GetOpenedQuestions(_forum_config=forum_config) {
  const question_per_page = 20
  const discussion_count = RulzFollowUp_GetForumQuestionCountFromForumListPage()
  const forum_url = _forum_config["en"]["target_forum_url"];
  let html = UrlFetchApp.fetch(forum_url).getContentText();
  from_str = 'data-pagekey="'
  url_base = forum_url + '?' +
    Parser.data(html).from(from_str).to('"').build() + "="

  page_num = Math.ceil(discussion_count / question_per_page)

  console.log(discussion_count, page_num)

  // page_num = 1; // FOR DEBUG

  let results = []
  for (i=1; i<=page_num; i++) {
    let url = url_base + i
    let html = UrlFetchApp.fetch(url).getContentText();
    console.log("Get URLs: ", i, "/", page_num)

    // views Q&A link(split block with h2 tag)
    from_str = '<h2>'
    to_str = '</h2>'
    blocks = Parser.data(html).from(from_str).to(to_str).iterate()

    // discussion info
    from_str = 'answer-status">'
    to_str = '</span>'
    ans_state = Parser.data(html).from(from_str).to(to_str).iterate()

    // last posted person
    from_str = 'by <a href'
    to_str = '</a>'
    last_posted = Parser.data(html).from(from_str).to(to_str).iterate()

    // Q&A title
    from_str = '<div class="name cell">'
    to_str = '</a>'
    titles = Parser.data(html).from(from_str).to(to_str).iterate()

    // last activities
    from_str = 'cell nowrap latest'
    to_str = '</time>'
    last_updates = Parser.data(html).from(from_str).to(to_str).iterate()

    for (j=0; j<ans_state.length; ++j){
      if(!ans_state[j].match(' answered ')) {
        url = blocks[j].split('"')[1]
        posted_user = last_posted[j].split('>')[1]
        title = titles[j].split('">')[1]
        last_update = last_updates[j].split('Z">')[1]
        // console.log("Not closed : ", url, posted_user)
        // console.log(title, url, posted_user, last_update)
        // console.log("")
        results.push([title, url, posted_user, last_update])
      }
    }
  }

  return results;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

function RulzFollowUp_GetWhiteboxStatistics(_forum_config=forum_config) {
  const urls = RulzFollowUp_GetDiscussionList(_forum_config)

  /** 各QAの情報を取得 -> data_listへ格納 */
  data_list = []
  url_counter = 1
  urls.forEach(function(url){
    console.log("Get TAGs: ", url_counter, "/", urls.length); url_counter += 1
    let html = UrlFetchApp.fetch(url).getContentText();
    // OpenDate
    from_str = 'data-dateutc="'; to_str = 'T'
    open_date = Parser.data(html).from(from_str).to(to_str).build()
    // Close State
    from_str = '<li class="attribute-item state'; to_str = '">'
    close_state = Parser.data(html).from(from_str).to(to_str).build()
    close_state = close_state.replace(/ /g,"").replace(/	/g,"").replace(/verified/g,"closed")
    // Category: Y.H. answered = WB related
    const qa_json_url = RulzScrape_GetJsonLinkFromURL(url)
    var _data = RulzScrape__GetReplyInfoFromJson(qa_json_url);
    category = "other";
    for (let n=0; n<_data.length; ++n) {
      if(_data[n][1].match('Y.H.')) { // _data[n] = [date, reply_author]
        category = "WB"; break;
      }
    }
    data_list.push([open_date, close_state, category]);
  })
  /** 結果の生成 */
  // WB categoryだけの配列を生成
  console.log(data_list)
  data_list_wb = data_list.filter(row => {
    if(row[2].match("WB")) return true;
    else return false;
  });
  // 
  const fullYear = new Date().getFullYear();
  // 全体
  g_total = data_list.length
  g_closed = data_list.filter(row => row[1].match("closed")).length
  y_g_total = data_list.filter(row => row[0].match(fullYear)).length
  y_g_closed = data_list.filter(row => row[0].match(fullYear)).filter(row => row[1].match("closed")).length

  // WB
  total = data_list_wb.length
  closed = data_list_wb.filter(row => row[1].match("closed")).length
  y_total = data_list_wb.filter(row => row[0].match(fullYear)).length
  y_closed = data_list_wb.filter(row => row[0].match(fullYear)).filter(row => row[1].match("closed")).length

  // generate mail body
  ret = ""
  ret +="---------------------------------" + "\n"  
  ret +="Gateway Group support状況\n"
  ret +="年内("+fullYear+")\n"
  ret +="  total: "+y_g_total+", closed: "+y_g_closed+", wip: "+(y_g_total-y_g_closed)+"\n"
  ret +="累計\n"
  ret +="  total: "+g_total+", closed: "+g_closed+", wip: "+(g_total-g_closed)+"\n"
  ret +="---------------------------------" + "\n"  
  ret +="Whitebox SDK support状況\n"
  ret +="年内("+fullYear+")\n"
  ret +="  total: "+y_total+", closed: "+y_closed+", wip: "+(y_total-y_closed)+"\n"
  ret +="累計\n"
  ret +="  total: "+total+", closed: "+closed+", wip: "+(total-closed)+"\n"
  ret +="---------------------------------" + "\n"  
  ret +="\n"

  return ret
}

function RulzFollowUp_GetDiscussionList(_forum_config=forum_config) {
  const discussion_count = RulzFollowUp_GetForumQuestionCountFromForumListPage(forum_config)
  const forum_url = _forum_config["en"]["target_forum_url"]
  let html = UrlFetchApp.fetch(forum_url).getContentText();
  from_str = 'data-pagekey="'
  url_base = forum_url + '?' +
    Parser.data(html).from(from_str).to('"').build() + "="
  page_num = Math.ceil(discussion_count / _forum_config["en"]["question_per_page"])

  let urls = [];
  for (i=1; i<=page_num; i++) {
    let url = url_base + i
    let html = UrlFetchApp.fetch(url).getContentText();
    from_str = '<h2>'; to_str = '</h2>'
    blocks = Parser.data(html).from(from_str).to(to_str).iterate()
    loop = blocks.length
    for(n=0; n<loop; n++) {
      urls.push( blocks[n].split('"')[1] )
    }
  }
  return urls
}

function RulzFollowUp_GetJsonLinkFromURL(url) {
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

  return json_url;
}

function RulzFollowUp_GetReplyInfoFromJson(json_url) {
  let html = UrlFetchApp.fetch(json_url).getContentText();

  from_str = '0px\\" alt=\\"'; to_str = '\\" '
  authors = Parser.data(html).from(from_str).to(to_str).iterate()

  from_str = 'createdDate":  "'; to_str = 'T'
  createDates = Parser.data(html).from(from_str).to(to_str).iterate()

  let data_list = []
  for (let i=0; i<authors.length; i++){
    if ( createDates[i].trim() !== '' && authors[i].trim() !== '') {
      data_list.push([createDates[i], authors[i]])
    }
  }

  // Check remain replies
  from_str = 'NextSiblingCount":  '; to_str = ' ,'
  remain_replies = Parser.data(html).from(from_str).to(to_str).iterate().slice(-1)[0]
  if( isNaN(remain_replies) == false && remain_replies != 0) {
    // Get Last replay's Id
    from_str = '"id": "'; to_str = '",'
    last_reply_id = Parser.data(html).from(from_str).to(to_str).iterate().slice(-1)[0]
    const new_json_url = json_url + "&_w_flattenedDepth=0&_w_startReplyId=" + last_reply_id
    const tmp_data_list = _GetReplyInfoFromJson(new_json_url)
    data_list.push(...tmp_data_list)
  }
  return data_list;
}
