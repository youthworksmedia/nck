import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const root = process.cwd();
const outputManualDir = path.join(root, "private-uploads", "resources", "manual");
const outputWorksheetDir = path.join(root, "private-uploads", "resources", "worksheet");
const worksheetTemplatePath = "/Users/robert/Downloads/gig-lesson-template.pdf";
const logoPath = path.join(root, "public", "pdf-logo.png");
const dogPath = path.join(root, "public", "pdf-dog.png");
const copyrightYear = new Date().getFullYear();
const defaultSqlSeedPath = path.join(root, "supabase", "year1_curriculum_plan.sql");
const defaultAttachSqlPath = path.join(root, "supabase", "attach_year_a_generated_assets.sql");

function sqlUnescape(value) {
  return value.replaceAll("''", "'");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function scriptureSlug(value) {
  return value
    .toLowerCase()
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseLessons(sql, targetYear) {
  const tuplePattern =
    /\('((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(\d+),\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)'\)/g;

  const lessons = [];

  for (const match of sql.matchAll(tuplePattern)) {
    const title = sqlUnescape(match[1]);
    const lessonNumber = Number(match[3]);
    const scripture = sqlUnescape(match[4]);
    const yearCycle = sqlUnescape(match[6]);
    const term = sqlUnescape(match[7]);

    if (yearCycle !== targetYear) continue;

    lessons.push({
      title,
      lessonNumber,
      scripture,
      yearCycle,
      term
    });
  }

  return lessons.sort((a, b) => {
    if (a.term !== b.term) return a.term.localeCompare(b.term);
    return a.lessonNumber - b.lessonNumber;
  });
}

function buildProfile(lesson) {
  const scripture = lesson.scripture;
  const title = lesson.title;
  const lowerTitle = title.toLowerCase();

  const base = {
    theme: title,
    focus:
      "This lesson helps children see God’s truth clearly in this passage and understand how His word shapes the way we trust, worship, and follow Him.",
    goals: [
      "Children will understand the key truth in this Bible passage.",
      "Children will identify what the lesson shows about God, Jesus, or God’s people.",
      "Children will consider one faithful way to respond to God’s word."
    ],
    outcome:
      "Children can retell the main movement of the lesson, explain the key truth, and share one simple response of trust or obedience.",
    hook:
      "Begin with a simple object lesson, picture prompt, or repeat-after-me question that helps children connect with the big idea before reading.",
    teachSteps: [
      "Read the key verses slowly and clearly, stopping to explain unfamiliar words.",
      "Retell the story in short sections, using gestures, repetition, and simple questions.",
      "Pause to highlight what the passage shows about God’s character, promises, or power.",
      "Help children connect the lesson to trusting God in everyday life."
    ],
    teacherTips: [
      "Use repetition and short summary phrases so children can remember the main idea.",
      "Ask observation questions before explanation questions to keep children engaged with the Bible text.",
      "Reinforce the lesson with one clear visual, movement, or response activity."
    ],
    discussion: [
      "What happened first in this lesson?",
      "What does this lesson show us about God or Jesus?",
      "How should we respond to what we have learned today?"
    ],
    prayer:
      "Thank God for His word, ask for hearts that trust Him, and pray that the children would remember the big truth from today’s lesson.",
    worksheetActivities: [
      { kind: "Quiz", heading: "Quick Quiz", prompt: "Circle the answer that best matches the story." },
      { kind: "Match", heading: "Match It", prompt: "Draw lines to match the picture, word, or truth." },
      { kind: "Draw", heading: "Draw It", prompt: "Draw the key part of the lesson and tell what happened." }
    ]
  };

  if (scripture.startsWith("Genesis 1")) {
    return {
      ...base,
      theme: "God Made It All",
      focus:
        "This lesson shows that God created everything by His word and that creation displays His glory, wisdom, and power. Children will see that the world belongs to God from the very beginning.",
      goals: [
        "Children will understand that God made everything from nothing.",
        "Children will recognise that creation shows God’s wisdom, goodness, and power.",
        "Children will see that the right response to the Creator is worship and thankfulness."
      ],
      outcome:
        "Children can retell what God made in the passage and explain why God alone deserves praise as Creator.",
      hook:
        "Start with a creation sorting game or picture reveal and ask, “Who made all of this?” before opening the Bible.",
      discussion: [
        "What did God make in this part of creation?",
        "How does creation show us that God is powerful and wise?",
        "Why should we thank and worship God as Creator?"
      ],
      worksheetActivities: [
        { kind: "Draw", heading: "Draw Creation", prompt: "Draw one thing God made in today’s lesson." },
        { kind: "Quiz", heading: "Who Made It?", prompt: "Circle the things that belong in God’s creation story." },
        { kind: "Colour", heading: "Colour Time", prompt: "Colour the creation picture while saying what God made." }
      ]
    };
  }

  if (scripture.startsWith("Genesis 2")) {
    return {
      ...base,
      theme: "God’s Good Design",
      focus:
        "This lesson shows God’s good design for people, work, rest, and relationships. Children will see that God made humanity with purpose and kindness.",
      goals: [
        "Children will understand that God made people in a special and purposeful way.",
        "Children will recognise that God provides what His people need.",
        "Children will see that God’s way for life is good and wise."
      ],
      outcome:
        "Children can retell how God cared for people in the passage and explain one way God’s design is good.",
      worksheetActivities: [
        { kind: "Match", heading: "Match God’s Gifts", prompt: "Match each good gift to the person or place in the lesson." },
        { kind: "Draw", heading: "Draw the Garden", prompt: "Draw the place God prepared and add one thing from the story." },
        { kind: "Talk", heading: "Talk It Out", prompt: "Tell a partner one way God cares for His people." }
      ]
    };
  }

  if (scripture.startsWith("Genesis 3") || scripture.startsWith("Genesis 4")) {
    return {
      ...base,
      theme: "Sin Changes Everything",
      focus:
        "This lesson shows that sin is serious because it rejects God’s good word and brings sadness, fear, and brokenness. Children will also see that God gives hope even in a fallen world.",
      goals: [
        "Children will understand that sin is disobeying and rejecting God.",
        "Children will recognise the sad results of sin in the world.",
        "Children will see their need for God’s mercy and saving promise."
      ],
      outcome:
        "Children can retell what went wrong in the lesson and explain why people need God’s rescue.",
      worksheetActivities: [
        { kind: "Quiz", heading: "Right or Wrong?", prompt: "Circle the choices that matched God’s good word." },
        { kind: "Think", heading: "Think About It", prompt: "Point to the part of the story where things changed." },
        { kind: "Pray", heading: "Prayer Box", prompt: "Write or draw one way to ask God for help to obey Him." }
      ]
    };
  }

  if (scripture.startsWith("Genesis 6") || scripture.startsWith("Genesis 8") || scripture.startsWith("Genesis 9")) {
    return {
      ...base,
      theme: "God Judges and Saves",
      focus:
        "This lesson shows both God’s holiness in judging sin and His kindness in saving people by His promise. Children will see that God is righteous, faithful, and gracious.",
      goals: [
        "Children will understand that God is holy and takes sin seriously.",
        "Children will recognise that God provides a way of salvation.",
        "Children will see that God keeps His covenant promises."
      ],
      outcome:
        "Children can explain how God showed both justice and mercy in the lesson and why His promises can be trusted.",
      worksheetActivities: [
        { kind: "Draw", heading: "Draw the Promise", prompt: "Draw the part of the story that shows God’s rescue." },
        { kind: "Match", heading: "Match the Story", prompt: "Match each event to the right part of the lesson." },
        { kind: "Quiz", heading: "Story Check", prompt: "Tick the sentence that tells the Bible truth." }
      ]
    };
  }

  if (scripture.startsWith("Genesis 12") || scripture.startsWith("Genesis 15") || scripture.startsWith("Genesis 17") || scripture.startsWith("Genesis 21") || scripture.startsWith("Genesis 22") || scripture.startsWith("Genesis 28") || scripture.startsWith("Genesis 32")) {
    return {
      ...base,
      theme: "God Keeps His Promises",
      focus:
        "This lesson shows God calling His people and giving covenant promises that point to His saving plan. Children will see that God’s people live by trusting His word.",
      goals: [
        "Children will understand that God makes and keeps His promises.",
        "Children will recognise that faith means trusting God even when the future is unclear.",
        "Children will see that God’s plan reaches beyond one person to many nations."
      ],
      outcome:
        "Children can retell the promise in the passage and explain why God’s people can trust Him.",
      worksheetActivities: [
        { kind: "Quiz", heading: "Promise Check", prompt: "Circle the promise God gave in the lesson." },
        { kind: "Match", heading: "Trust Match", prompt: "Match the person to the promise or response." },
        { kind: "Draw", heading: "Draw the Promise", prompt: "Draw the special moment that showed God’s promise." }
      ]
    };
  }

  if (scripture.startsWith("Genesis 37") || scripture.startsWith("Genesis 39") || scripture.startsWith("Genesis 45")) {
    return {
      ...base,
      theme: "God Is Still at Work",
      focus:
        "This lesson shows that God is still at work even in hard, unfair, or confusing situations. Children will see that God’s good purposes are never lost.",
      goals: [
        "Children will understand that God is sovereign in every circumstance.",
        "Children will recognise that God can bring good through suffering and trouble.",
        "Children will see examples of faith, forgiveness, and perseverance."
      ],
      outcome:
        "Children can retell the main events of the lesson and explain how God was still working for good.",
      worksheetActivities: [
        { kind: "Think", heading: "What Changed?", prompt: "Point to the moment God turned the story around." },
        { kind: "Draw", heading: "Draw the Scene", prompt: "Draw the scene where God’s plan became clear." },
        { kind: "Quiz", heading: "Story Quiz", prompt: "Circle the sentence that best tells the big idea." }
      ]
    };
  }

  if (scripture.startsWith("Exodus")) {
    return {
      ...base,
      theme: "God Saves His People",
      focus:
        "This lesson shows that God hears His people, raises a deliverer, and acts with power to rescue them. Children will see that God is faithful and mighty to save.",
      goals: [
        "Children will understand that God remembers His people and His promises.",
        "Children will recognise that God has power to rescue.",
        "Children will see that trusting God leads to courageous obedience."
      ],
      outcome:
        "Children can retell how God acted to save in the lesson and explain why His power gives hope.",
      worksheetActivities: [
        { kind: "Match", heading: "Rescue Match", prompt: "Match the person or event to how God helped." },
        { kind: "Quiz", heading: "Power Quiz", prompt: "Circle the answer that shows God’s power." },
        { kind: "Draw", heading: "Draw the Rescue", prompt: "Draw the part of the story where God rescued His people." }
      ]
    };
  }

  if (scripture.startsWith("Psalm") || scripture.startsWith("Isaiah 43") || scripture.startsWith("Colossians 1")) {
    return {
      ...base,
      theme: "All Creation Shows God’s Glory",
      focus:
        "This lesson helps children celebrate God’s greatness, rule, and glory. They will see that all creation points beyond itself to the living God.",
      goals: [
        "Children will understand that the whole world belongs to God.",
        "Children will recognise that creation tells us God is glorious and wise.",
        "Children will see that worship is the right response to God’s greatness."
      ],
      outcome:
        "Children can explain what the passage shows about God’s glory and give one reason to praise Him.",
      worksheetActivities: [
        { kind: "Colour", heading: "Colour the World", prompt: "Colour the picture and name one way creation shows God’s glory." },
        { kind: "Draw", heading: "Draw and Praise", prompt: "Draw one creation gift and say thank you to God." },
        { kind: "Quiz", heading: "Praise Quiz", prompt: "Tick the words that describe God from the lesson." }
      ]
    };
  }

  if (scripture.startsWith("John 1")) {
    return {
      ...base,
      theme: "Jesus Is the Light and Life",
      focus:
        "This lesson shows that Jesus is the eternal Son of God who came into the world as the Word made flesh. Children will see that true life and light are found in Him.",
      goals: [
        "Children will understand that Jesus is fully God and truly came into the world.",
        "Children will recognise that Jesus reveals God perfectly.",
        "Children will see that Jesus brings life, light, and grace."
      ],
      outcome:
        "Children can retell what the passage says about Jesus and explain why He is worthy of trust and worship.",
      worksheetActivities: [
        { kind: "Quiz", heading: "Light Quiz", prompt: "Circle the sentence that tells the truth about Jesus." },
        { kind: "Draw", heading: "Draw the Light", prompt: "Draw a picture showing Jesus as light." },
        { kind: "Talk", heading: "Say It", prompt: "Tell someone one thing this lesson teaches about Jesus." }
      ]
    };
  }

  if (scripture.startsWith("John 2")) {
    return {
      ...base,
      theme: "Jesus Shows His Glory",
      focus:
        "This lesson shows Jesus revealing His glory and authority through His actions. Children will see that Jesus is the promised King who deserves faith and honour.",
      goals: [
        "Children will understand that Jesus performs signs that reveal who He is.",
        "Children will recognise that Jesus has authority over worship and life.",
        "Children will see that true faith listens to Jesus and trusts Him."
      ],
      outcome:
        "Children can retell what Jesus did and explain what it shows about His glory and authority.",
      worksheetActivities: [
        { kind: "Quiz", heading: "Sign Check", prompt: "Circle the sign that showed Jesus’ glory." },
        { kind: "Draw", heading: "Draw the Story", prompt: "Draw the moment Jesus showed His power." },
        { kind: "Match", heading: "Match the Truth", prompt: "Match Jesus’ action to what it teaches." }
      ]
    };
  }

  if (scripture.startsWith("John 3")) {
    return {
      ...base,
      theme: "New Life from Above",
      focus:
        "This lesson shows that people need new life from God and that eternal life comes through trusting Jesus. Children will see the greatness of God’s love in sending His Son.",
      goals: [
        "Children will understand that no one can save themselves.",
        "Children will recognise that eternal life comes through faith in Jesus.",
        "Children will see that God’s love is shown in sending His Son."
      ],
      outcome:
        "Children can explain the big truth of the lesson and tell why trusting Jesus matters.",
      worksheetActivities: [
        { kind: "Quiz", heading: "New Life Quiz", prompt: "Circle the answer that shows how people receive life." },
        { kind: "Draw", heading: "Draw the Truth", prompt: "Draw a picture to show God’s love in this lesson." },
        { kind: "Talk", heading: "Say the Verse", prompt: "Say one part of the lesson that helps you trust Jesus." }
      ]
    };
  }

  if (scripture.startsWith("John 4")) {
    return {
      ...base,
      theme: "Jesus Gives Living Water",
      focus:
        "This lesson shows Jesus meeting people with grace, truth, and living water. Children will see that only Jesus can satisfy the deepest thirst of the heart.",
      goals: [
        "Children will understand that Jesus welcomes needy people with grace.",
        "Children will recognise that only Jesus gives living water and true life.",
        "Children will see that meeting Jesus leads people to share the good news."
      ],
      outcome:
        "Children can retell how Jesus met someone in need and explain why He is the source of real life and hope.",
      worksheetActivities: [
        { kind: "Quiz", heading: "Living Water Quiz", prompt: "Circle the answer that shows what Jesus gives." },
        { kind: "Draw", heading: "Draw the Well", prompt: "Draw the place where Jesus met the woman." },
        { kind: "Talk", heading: "Tell a Friend", prompt: "Tell someone one thing Jesus said in this story." }
      ]
    };
  }

  if (scripture.startsWith("John 5")) {
    return {
      ...base,
      theme: "Jesus Gives Life",
      focus:
        "This lesson shows Jesus’ authority over sickness, the Sabbath, and life itself. Children will see that the Son has power to heal and give life according to the Father’s will.",
      goals: [
        "Children will understand that Jesus has divine authority.",
        "Children will recognise that Jesus gives life and deserves honour.",
        "Children will see that Jesus’ words call for faith and obedience."
      ],
      outcome:
        "Children can retell the healing or teaching in the passage and explain what it reveals about Jesus’ power.",
      worksheetActivities: [
        { kind: "Match", heading: "Match the Miracle", prompt: "Match the action of Jesus to what happened next." },
        { kind: "Quiz", heading: "Life Quiz", prompt: "Circle the sentence that tells the lesson truth." },
        { kind: "Draw", heading: "Draw the Healing", prompt: "Draw the person Jesus helped in the story." }
      ]
    };
  }

  if (scripture.startsWith("John 6")) {
    return {
      ...base,
      theme: "Jesus Provides What We Need",
      focus:
        "This lesson shows Jesus caring for people in their need and revealing Himself as the true bread from heaven. Children will see that Jesus gives what lasts forever.",
      goals: [
        "Children will understand that Jesus is compassionate and powerful.",
        "Children will recognise that physical needs point to our deeper need for Him.",
        "Children will see that Jesus alone truly satisfies."
      ],
      outcome:
        "Children can retell how Jesus provided and explain why He is the one who gives lasting life.",
      worksheetActivities: [
        { kind: "Quiz", heading: "Bread Quiz", prompt: "Circle the answer that shows how Jesus helped the crowd." },
        { kind: "Draw", heading: "Draw the Meal", prompt: "Draw the moment Jesus provided for the people." },
        { kind: "Match", heading: "Match the Truth", prompt: "Match the picture to the lesson truth." }
      ]
    };
  }

  if (scripture.startsWith("John 7") || scripture.startsWith("John 8")) {
    return {
      ...base,
      theme: "Jesus Teaches the Truth",
      focus:
        "This lesson shows Jesus teaching boldly, challenging unbelief, and calling people to receive God’s truth. Children will see that His words bring light, freedom, and life.",
      goals: [
        "Children will understand that Jesus teaches with authority and truth.",
        "Children will recognise that people must choose how they respond to Him.",
        "Children will see that following Jesus means walking in His light and word."
      ],
      outcome:
        "Children can retell the key teaching in the passage and explain how Jesus calls people to faith and obedience.",
      worksheetActivities: [
        { kind: "Quiz", heading: "Truth Quiz", prompt: "Circle the sentence that matches Jesus’ teaching." },
        { kind: "Draw", heading: "Draw the Light", prompt: "Draw something that helps you remember Jesus’ words." },
        { kind: "Talk", heading: "Tell It Back", prompt: "Say one thing Jesus taught in today’s lesson." }
      ]
    };
  }

  if (scripture.startsWith("John 9")) {
    return {
      ...base,
      theme: "Jesus Opens Blind Eyes",
      focus:
        "This lesson shows Jesus healing blindness and revealing the deeper need for spiritual sight. Children will see that Jesus helps people truly see who He is.",
      goals: [
        "Children will understand that Jesus has power to heal and restore.",
        "Children will recognise the difference between faith and stubborn unbelief.",
        "Children will see that true sight means recognising Jesus."
      ],
      outcome:
        "Children can retell the healing and explain why trusting Jesus leads to true sight.",
      worksheetActivities: [
        { kind: "Quiz", heading: "Sight Quiz", prompt: "Circle the part of the story where the man saw clearly." },
        { kind: "Draw", heading: "Draw the Miracle", prompt: "Draw the moment the man received sight." },
        { kind: "Match", heading: "See and Match", prompt: "Match the people to how they responded to Jesus." }
      ]
    };
  }

  if (scripture.startsWith("John 10")) {
    return {
      ...base,
      theme: "Jesus Our Good Shepherd",
      focus:
        "This lesson shows Jesus as the Good Shepherd who knows, protects, and lays down His life for His sheep. Children will see that His people are safe in His care.",
      goals: [
        "Children will understand that Jesus lovingly leads His people.",
        "Children will recognise that Jesus gave His life for His sheep.",
        "Children will see that God’s people hear and follow Jesus."
      ],
      outcome:
        "Children can explain what makes Jesus the Good Shepherd and how His people respond to Him.",
      worksheetActivities: [
        { kind: "Match", heading: "Shepherd Match", prompt: "Match the shepherd words to what Jesus does." },
        { kind: "Draw", heading: "Draw the Sheep", prompt: "Draw the sheep safe with the shepherd." },
        { kind: "Quiz", heading: "Voice Quiz", prompt: "Circle the answer that shows how the sheep respond." }
      ]
    };
  }

  if (scripture.startsWith("John 11")) {
    return {
      ...base,
      theme: "Jesus Is the Resurrection and the Life",
      focus:
        "This lesson shows Jesus’ compassion in sadness and His power over death. Children will see that Jesus gives hope that reaches beyond the grave.",
      goals: [
        "Children will understand that Jesus cares deeply for hurting people.",
        "Children will recognise that Jesus has authority even over death.",
        "Children will see that true hope is found in Christ alone."
      ],
      outcome:
        "Children can retell what Jesus did and explain why He gives real hope in life and death.",
      worksheetActivities: [
        { kind: "Draw", heading: "Draw the Hope", prompt: "Draw the moment Jesus showed His power." },
        { kind: "Quiz", heading: "Hope Quiz", prompt: "Circle the answer that tells what Jesus can do." },
        { kind: "Talk", heading: "Tell the Truth", prompt: "Tell someone why Jesus gives hope." }
      ]
    };
  }

  if (scripture.startsWith("John 12")) {
    return {
      ...base,
      theme: "Jesus Comes to Save",
      focus:
        "This lesson shows Jesus moving toward the cross while calling people to honour Him and believe in Him. Children will see that Jesus came to save through humble obedience.",
      goals: [
        "Children will understand that Jesus came to bring salvation through His mission.",
        "Children will recognise that people respond to Jesus in different ways.",
        "Children will see that the right response is faith, worship, and trust."
      ],
      outcome:
        "Children can retell the key scene or teaching and explain how it points to Jesus’ saving mission.",
      worksheetActivities: [
        { kind: "Quiz", heading: "Mission Quiz", prompt: "Circle the answer that shows why Jesus came." },
        { kind: "Draw", heading: "Draw the Scene", prompt: "Draw the moment that helps you remember Jesus’ mission." },
        { kind: "Match", heading: "Match the Response", prompt: "Match the person to the way they responded to Jesus." }
      ]
    };
  }

  if (scripture.startsWith("Matthew 4") || scripture.startsWith("Mark 3")) {
    return {
      ...base,
      theme: "Jesus Calls His Followers",
      focus:
        "This lesson shows Jesus choosing ordinary people to follow Him. Children will see that Jesus teaches, loves, and shapes His disciples for His purposes.",
      goals: [
        "Children will understand that Jesus calls people to follow Him.",
        "Children will recognise that discipleship begins with trust and obedience.",
        "Children will see that Jesus can use ordinary people in His work."
      ],
      outcome:
        "Children can retell how Jesus called His followers and explain what it means to follow Him today.",
      worksheetActivities: [
        { kind: "Match", heading: "Follow Match", prompt: "Match the disciple to the call of Jesus." },
        { kind: "Quiz", heading: "Follow Quiz", prompt: "Circle the answer that shows what disciples do." },
        { kind: "Draw", heading: "Draw the Call", prompt: "Draw the moment Jesus called His followers." }
      ]
    };
  }

  if (scripture.startsWith("Matthew 5") || scripture.startsWith("Matthew 6") || scripture.startsWith("Mark 10:42-45")) {
    return {
      ...base,
      theme: "Jesus Teaches the Heart",
      focus:
        "This lesson shows Jesus teaching His followers how to live in God’s kingdom. Children will see that Jesus cares about both our hearts and our actions.",
      goals: [
        "Children will understand that Jesus teaches with authority and wisdom.",
        "Children will recognise that following Jesus affects the whole of life.",
        "Children will see that God shapes both attitudes and actions."
      ],
      outcome:
        "Children can explain the main teaching from the lesson and identify one way Jesus wants His followers to live.",
      worksheetActivities: [
        { kind: "Quiz", heading: "Teaching Quiz", prompt: "Circle the sentence that matches Jesus’ teaching." },
        { kind: "Draw", heading: "Draw the Lesson", prompt: "Draw one part of the lesson teaching." },
        { kind: "Talk", heading: "Say It", prompt: "Tell a partner one way to live Jesus’ way." }
      ]
    };
  }

  if (scripture.startsWith("Matthew 10") || scripture.startsWith("Matthew 28") || scripture.startsWith("Acts 1")) {
    return {
      ...base,
      theme: "Jesus Sends His People",
      focus:
        "This lesson shows Jesus sending His followers with His authority and mission. Children will see that God equips His people to speak, serve, and witness in His name.",
      goals: [
        "Children will understand that Jesus gives His followers a mission.",
        "Children will recognise that God equips His people by His Spirit and presence.",
        "Children will see that Christians are called to help others know Jesus."
      ],
      outcome:
        "Children can explain the mission Jesus gives and share one way they can witness for Him.",
      worksheetActivities: [
        { kind: "Match", heading: "Mission Match", prompt: "Match the action to the mission Jesus gives." },
        { kind: "Quiz", heading: "Mission Quiz", prompt: "Circle the answer that shows what Jesus told His followers." },
        { kind: "Draw", heading: "Draw the Mission", prompt: "Draw someone sharing the good news." }
      ]
    };
  }

  if (scripture.startsWith("Luke 1") || scripture.startsWith("Luke 2") || scripture.startsWith("Luke 9")) {
    return {
      ...base,
      theme: "God Keeps His Promise in Jesus",
      focus:
        "This lesson shows God keeping His promises through the coming and work of Jesus. Children will see that Jesus is the promised Saviour who calls for joyful faith.",
      goals: [
        "Children will understand that Jesus fulfils God’s saving plan.",
        "Children will recognise that God’s promises are trustworthy.",
        "Children will see that following Jesus means trusting and obeying Him."
      ],
      outcome:
        "Children can retell the key events and explain how the lesson shows God keeping His promises in Jesus.",
      worksheetActivities: [
        { kind: "Quiz", heading: "Promise Quiz", prompt: "Circle the answer that shows God kept His promise." },
        { kind: "Draw", heading: "Draw the Promise", prompt: "Draw the scene that helps you remember God’s promise." },
        { kind: "Talk", heading: "Tell the Story", prompt: "Tell one part of the story to a friend." }
      ]
    };
  }

  if (scripture.startsWith("Romans 5")) {
    return {
      ...base,
      theme: "Grace Is Greater",
      focus:
        "This lesson shows that sin came through Adam, but grace and life come through Jesus Christ. Children will see the greatness of God’s rescue in the gospel.",
      goals: [
        "Children will understand the problem of sin and the hope of grace.",
        "Children will recognise that Jesus succeeds where Adam failed.",
        "Children will see that eternal life is God’s gift through Christ."
      ],
      outcome:
        "Children can explain the contrast between Adam and Jesus and tell why God’s grace is such good news.",
      worksheetActivities: [
        { kind: "Match", heading: "Grace Match", prompt: "Match Adam and Jesus to what each brought." },
        { kind: "Quiz", heading: "Grace Quiz", prompt: "Circle the sentence that shows the good news." },
        { kind: "Talk", heading: "Say It Back", prompt: "Tell someone why Jesus is better than Adam." }
      ]
    };
  }

  if (scripture.startsWith("Acts 2")) {
    return {
      ...base,
      theme: "The Spirit Gives Power",
      focus:
        "This lesson shows the Holy Spirit empowering the early believers and Peter boldly preaching the good news about Jesus. Children will see that God builds His church through His word and Spirit.",
      goals: [
        "Children will understand that the Holy Spirit gives power for witness.",
        "Children will recognise that the message of Jesus brings repentance and forgiveness.",
        "Children will see that God gathers His people into a joyful church."
      ],
      outcome:
        "Children can retell what happened at Pentecost and explain why the gospel changes lives.",
      worksheetActivities: [
        { kind: "Quiz", heading: "Pentecost Quiz", prompt: "Circle the answer that shows what happened that day." },
        { kind: "Draw", heading: "Draw the Crowd", prompt: "Draw the crowd hearing the good news." },
        { kind: "Match", heading: "Match the Message", prompt: "Match the action to the gospel truth." }
      ]
    };
  }

  if (scripture.startsWith("Acts 3") || scripture.startsWith("Acts 4")) {
    return {
      ...base,
      theme: "Bold for Jesus",
      focus:
        "This lesson shows the early disciples speaking and acting in the name of Jesus with courage and compassion. Children will see that God works through His people to bless others and proclaim Christ.",
      goals: [
        "Children will understand that the disciples depended on Jesus’ power, not their own.",
        "Children will recognise that opposition does not stop God’s mission.",
        "Children will see that bold witness grows from confidence in the risen Jesus."
      ],
      outcome:
        "Children can retell the miracle or message and explain how the disciples showed courage in Jesus’ name.",
      worksheetActivities: [
        { kind: "Quiz", heading: "Boldness Quiz", prompt: "Circle the answer that shows courage for Jesus." },
        { kind: "Draw", heading: "Draw the Miracle", prompt: "Draw the way God helped someone through His people." },
        { kind: "Talk", heading: "Tell It Boldly", prompt: "Say one truth about Jesus from the lesson." }
      ]
    };
  }

  if (scripture.startsWith("Acts 8") || scripture.startsWith("Acts 9") || scripture.startsWith("Acts 10") || scripture.startsWith("Acts 11")) {
    return {
      ...base,
      theme: "The Good News Keeps Spreading",
      focus:
        "This lesson shows the gospel spreading to new places and new people as God works through obedient disciples. Children will see that Jesus continues His work through His followers.",
      goals: [
        "Children will understand that the gospel is for all kinds of people.",
        "Children will recognise that God changes lives and uses His people in mission.",
        "Children will see that faithful obedience helps God’s kingdom spread."
      ],
      outcome:
        "Children can retell how God worked through His people and explain how the good news keeps spreading.",
      worksheetActivities: [
        { kind: "Match", heading: "Mission Match", prompt: "Match the person to the way God used them." },
        { kind: "Quiz", heading: "Kingdom Quiz", prompt: "Circle the answer that shows how the gospel spread." },
        { kind: "Draw", heading: "Draw the Journey", prompt: "Draw one way the good news travelled in the lesson." }
      ]
    };
  }

  if (lowerTitle.includes("shepherd")) {
    return {
      ...base,
      theme: title,
      focus:
        "This lesson helps children see Jesus as the loving and faithful Shepherd who leads His people well. They will see that His care is personal, strong, and trustworthy.",
      goals: [
        "Children will understand that Jesus lovingly leads His people.",
        "Children will recognise that God’s people are safe in His care.",
        "Children will see that following Jesus means listening to His voice."
      ],
      outcome:
        "Children can explain why Jesus is a good shepherd and describe how His people respond to Him."
    };
  }

  return base;
}

function buildWorksheetBlocks(lesson, profile) {
  const defaults = [
    { kind: "Quiz", heading: "Quick Quiz", prompt: `Circle the best answer about ${lesson.title}.` },
    { kind: "Line", heading: "Draw the Line", prompt: `Draw lines to match the right clues from ${lesson.scripture}.` },
    { kind: "Draw", heading: "Draw It", prompt: `Draw the part of ${lesson.title} you remember best.` },
    { kind: "Cross", heading: "Mini Crossword", prompt: "Use the Bible words from today’s lesson to fill the crossword." },
    { kind: "Game", heading: "Bible Game", prompt: "Play the quick challenge and say the lesson truth out loud." }
  ];

  const provided = profile.worksheetActivities ?? [];
  const merged = [...provided];

  for (const fallback of defaults) {
    if (!merged.some((item) => item.kind === fallback.kind)) {
      merged.push(fallback);
    }
  }

  const first = merged[0];
  const second = merged.find((item) => item.kind === "Line") ?? merged[1];
  const third =
    merged.find((item) => item.kind === "Cross") ??
    merged.find((item) => item.kind === "Game") ??
    merged[2];

  return [first, second, third];
}

function drawWrappedText(page, text, options) {
  const {
    x,
    y,
    maxWidth,
    font,
    size,
    color = rgb(0.15, 0.19, 0.28),
    lineHeight = size * 1.35
  } = options;

  const paragraphs = text.split("\n");
  let cursorY = y;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";

    if (!words.length) {
      cursorY -= lineHeight;
      continue;
    }

    for (const word of words) {
      const nextLine = line ? `${line} ${word}` : word;
      const width = font.widthOfTextAtSize(nextLine, size);

      if (width > maxWidth && line) {
        page.drawText(line, { x, y: cursorY, size, font, color });
        cursorY -= lineHeight;
        line = word;
      } else {
        line = nextLine;
      }
    }

    if (line) {
      page.drawText(line, { x, y: cursorY, size, font, color });
      cursorY -= lineHeight;
    }
  }

  return cursorY;
}

function drawCenteredFooter(page, text, font, size, color = rgb(0.2, 0.3, 0.45)) {
  const pageWidth = page.getWidth();
  const textWidth = font.widthOfTextAtSize(text, size);

  page.drawText(text, {
    x: (pageWidth - textWidth) / 2,
    y: 28,
    size,
    font,
    color
  });
}

function ensureSpace(pdf, page, y, minimumHeight, pageFactory) {
  if (y - minimumHeight > 65) {
    return { page, y };
  }

  const nextPage = pageFactory(false);
  return { page: nextPage, y: nextPage.getHeight() - 139 };
}

async function createManualPdf(pdf, lesson, profile, assets) {
  const { regular, bold, logo, dog } = assets;

  const makePage = (isFirstPage = true) => {
    const page = pdf.addPage([595, 842]);

    page.drawRectangle({
      x: 0,
      y: 0,
      width: 595,
      height: 842,
      color: rgb(0.995, 0.99, 0.965)
    });

    page.drawRectangle({
      x: 0,
      y: 760,
      width: 595,
      height: 82,
      color: rgb(0.96, 0.94, 0.76)
    });

    page.drawRectangle({
      x: 0,
      y: 0,
      width: 595,
      height: 20,
      color: rgb(0.12, 0.39, 0.71)
    });

    page.drawImage(logo, {
      x: 36,
      y: 768,
      width: 105,
      height: (logo.height / logo.width) * 105
    });

    page.drawImage(dog, {
      x: 486,
      y: 18,
      width: 66,
      height: (dog.height / dog.width) * 66
    });

    if (isFirstPage) {
      page.drawText("Teachers Manual", {
        x: 160,
        y: 792,
        size: 22,
        font: bold,
        color: rgb(0.1, 0.26, 0.45)
      });

      page.drawText(`${lesson.yearCycle} • ${lesson.term} • Lesson ${lesson.lessonNumber}`, {
        x: 160,
        y: 772,
        size: 11,
        font: regular,
        color: rgb(0.29, 0.33, 0.4)
      });
    } else {
      page.drawText(lesson.title, {
        x: 160,
        y: 784,
        size: 15,
        font: bold,
        color: rgb(0.1, 0.26, 0.45)
      });

      page.drawText(lesson.scripture, {
        x: 160,
        y: 766,
        size: 10,
        font: regular,
        color: rgb(0.72, 0.35, 0.08)
      });
    }

    drawCenteredFooter(
      page,
      `Copyright. All rights reserved God is Good Kids ${copyrightYear}`,
      regular,
      9
    );

    return page;
  };

  let page = makePage(true);
  let y = 728;

  page.drawText(lesson.title, {
    x: 40,
    y,
    size: 20,
    font: bold,
    color: rgb(0.14, 0.2, 0.28)
  });
  y -= 22;

  page.drawText(lesson.scripture, {
    x: 40,
    y,
    size: 12,
    font: regular,
    color: rgb(0.75, 0.36, 0.08)
  });
  y -= 28;

  const drawSection = (title, lines, bullet = false) => {
    ({ page, y } = ensureSpace(pdf, page, y, 130, makePage));
    page.drawText(title, {
      x: 40,
      y,
      size: 14,
      font: bold,
      color: rgb(0.1, 0.34, 0.58)
    });
    y -= 18;

    if (bullet) {
      for (const line of lines) {
        page.drawCircle({
          x: 46,
          y: y + 4,
          size: 2.8,
          color: rgb(0.94, 0.64, 0.16)
        });
        y = drawWrappedText(page, line, {
          x: 56,
          y,
          maxWidth: 485,
          font: regular,
          size: 11
        });
        y -= 6;
      }
    } else {
      for (const line of lines) {
        y = drawWrappedText(page, line, {
          x: 40,
          y,
          maxWidth: 500,
          font: regular,
          size: 11
        });
        y -= 4;
      }
    }

    y -= 10;
  };

  drawSection("Lesson Title / Theme", [profile.theme]);
  drawSection("Focus", [profile.focus]);
  drawSection("Goals", profile.goals, true);
  drawSection("Outcome", [profile.outcome]);
  drawSection("Teacher Hook", [profile.hook]);
  drawSection("Teaching Flow", profile.teachSteps, true);
  drawSection("Best Teaching Techniques", profile.teacherTips, true);
  drawSection("Discussion Prompts", profile.discussion, true);
  drawSection("Closing Prayer", [profile.prayer]);
}

async function createWorksheetPdf(pdf, lesson, profile, templatePdf, assets) {
  const { regular, bold } = assets;
  const [templatePage] = await pdf.copyPages(templatePdf, [0]);
  const page = pdf.addPage(templatePage);
  const { width, height } = page.getSize();
  const offsetY = 57;

  page.drawText(lesson.title, {
    x: 42,
    y: height - 66 - offsetY,
    size: 18,
    font: bold,
    color: rgb(0.12, 0.25, 0.48)
  });

  page.drawText(lesson.scripture, {
    x: 42,
    y: height - 88 - offsetY,
    size: 11,
    font: regular,
    color: rgb(0.72, 0.35, 0.08)
  });

  const blocks = buildWorksheetBlocks(lesson, profile);
  let topY = height - 185 - offsetY;

  for (const [index, block] of blocks.entries()) {
    page.drawRectangle({
      x: 50,
      y: topY - 44,
      width: 34,
      height: 34,
      color: index % 2 === 0 ? rgb(0.14, 0.54, 0.79) : rgb(0.98, 0.72, 0.16)
    });

    page.drawText(block.kind.slice(0, 1), {
      x: 63,
      y: topY - 33,
      size: 16,
      font: bold,
      color: index % 2 === 0 ? rgb(0.99, 0.99, 0.99) : rgb(0.12, 0.25, 0.48)
    });

    page.drawText(block.heading, {
      x: 94,
      y: topY - 26,
      size: 14,
      font: bold,
      color: rgb(0.12, 0.25, 0.48)
    });

    drawWrappedText(page, block.prompt, {
      x: 94,
      y: topY - 48,
      maxWidth: width - 130,
      font: regular,
      size: 11
    });

    topY -= 118;
  }

  page.drawText("Talk About It", {
    x: 50,
    y: 176,
    size: 14,
    font: bold,
    color: rgb(0.12, 0.25, 0.48)
  });

  drawWrappedText(page, "Tell your teacher or helper the main thing Jesus or God did in this lesson.", {
    x: 50,
    y: 154,
    maxWidth: width - 100,
    font: regular,
    size: 11
  });

  drawCenteredFooter(
    page,
    `Copyright. All rights reserved God is Good Kids ${copyrightYear}`,
    regular,
    9
  );
}

function buildAttachSql(records) {
  const lines = ["begin;", ""];

  for (const record of records) {
    lines.push(
      `update nck.resources`,
      `set manual_file_path = '${record.manualPath}',`,
      `    manual_file_name = '${record.manualName}',`,
      `    worksheet_file_path = '${record.worksheetPath}',`,
      `    worksheet_file_name = '${record.worksheetName}'`,
      `where year_cycle = '${record.yearCycle}'`,
      `  and term = '${record.term}'`,
      `  and title = '${record.title.replaceAll("'", "''")}';`,
      ""
    );
  }

  lines.push("commit;");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const sqlSeedInput = process.argv[2] ?? defaultSqlSeedPath;
  const targetYear = process.argv[3] ?? "Year A";
  const attachSqlInput = process.argv[4] ?? defaultAttachSqlPath;
  const sqlSeedPath = path.isAbsolute(sqlSeedInput) ? sqlSeedInput : path.join(root, sqlSeedInput);
  const attachSqlPath = path.isAbsolute(attachSqlInput) ? attachSqlInput : path.join(root, attachSqlInput);
  const yearCodePrefix = targetYear.toLowerCase().replace(/\s+/g, "");

  await mkdir(outputManualDir, { recursive: true });
  await mkdir(outputWorksheetDir, { recursive: true });

  const [sqlSeed, templateBytes, logoBytes, dogBytes] = await Promise.all([
    readFile(sqlSeedPath, "utf8"),
    readFile(worksheetTemplatePath),
    readFile(logoPath),
    readFile(dogPath)
  ]);

  const lessons = parseLessons(sqlSeed, targetYear);
  const templatePdf = await PDFDocument.load(templateBytes);
  const attachRecords = [];

  for (const [dir, prefixes] of [
    [outputManualDir, ["teachers-manual-term-", `${yearCodePrefix}_term`]],
    [outputWorksheetDir, ["worksheet-term-", `${yearCodePrefix}_term`]]
  ]) {
    const entries = await readdir(dir);

    for (const entry of entries) {
      if (prefixes.some((prefix) => entry.startsWith(prefix))) {
        await rm(path.join(dir, entry), { force: true });
      }
    }
  }

  for (const lesson of lessons) {
    const profile = buildProfile(lesson);
    const yearCode = lesson.yearCycle.toLowerCase().replace(/\s+/g, "");
    const termCode = lesson.term.toLowerCase().replace(/\s+/g, "");
    const scriptureCode = scriptureSlug(lesson.scripture);
    const manualName = `${yearCode}_${termCode}-${scriptureCode}_manual.pdf`;
    const worksheetName = `${yearCode}_${termCode}-${scriptureCode}_worksheet.pdf`;
    const manualPdf = await PDFDocument.create();
    const worksheetPdf = await PDFDocument.create();

    const manualAssets = {
      regular: await manualPdf.embedFont(StandardFonts.Helvetica),
      bold: await manualPdf.embedFont(StandardFonts.HelveticaBold),
      logo: await manualPdf.embedPng(logoBytes),
      dog: await manualPdf.embedPng(dogBytes)
    };

    const worksheetAssets = {
      regular: await worksheetPdf.embedFont(StandardFonts.Helvetica),
      bold: await worksheetPdf.embedFont(StandardFonts.HelveticaBold)
    };

    await createManualPdf(manualPdf, lesson, profile, manualAssets);
    await createWorksheetPdf(worksheetPdf, lesson, profile, templatePdf, worksheetAssets);

    await writeFile(path.join(outputManualDir, manualName), Buffer.from(await manualPdf.save()));
    await writeFile(path.join(outputWorksheetDir, worksheetName), Buffer.from(await worksheetPdf.save()));

    attachRecords.push({
      title: lesson.title,
      yearCycle: lesson.yearCycle,
      term: lesson.term,
      manualName,
      worksheetName,
      manualPath: `manual/${manualName}`,
      worksheetPath: `worksheet/${worksheetName}`
    });
  }

  await writeFile(attachSqlPath, buildAttachSql(attachRecords), "utf8");

  console.log(`Generated ${lessons.length} manuals and ${lessons.length} worksheets.`);
  console.log(`Attach SQL written to ${attachSqlPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
