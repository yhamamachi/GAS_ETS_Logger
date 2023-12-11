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
  mail_body = RulzFollowUp_generateMailBody(q_list)
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

  page_num = 1 + Math.floor(discussion_count / question_per_page)
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


