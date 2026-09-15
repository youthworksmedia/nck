begin;

create schema if not exists nck;

create or replace function nck.build_curriculum_lesson_content(
  lesson_title text,
  lesson_scripture text
)
returns text
language plpgsql
SET search_path = nck
as $$
declare
  theme_text text;
  focus_text text;
  goal_one text;
  goal_two text;
  goal_three text;
  outcome_text text;
begin
  theme_text := coalesce(lesson_title, 'Bible Lesson');
  focus_text := 'Children will explore this Bible lesson and see how God reveals His truth, character, and saving purposes through His word.';
  goal_one := 'Children will understand the main truth taught in this passage.';
  goal_two := 'Children will see what this lesson teaches about God, Jesus, or God''s people.';
  goal_three := 'Children will consider how to respond to God with trust, obedience, and joy.';
  outcome_text := 'Children can retell the lesson clearly, explain its main idea, and describe one faithful response to God''s word.';

  if lesson_scripture like 'Genesis 1:%' then
    focus_text := 'This lesson shows that God made the world by His powerful word and that everything begins with Him. Children will see that creation displays God''s wisdom, goodness, and glory.';
    goal_one := 'Children will understand that God is the Creator of all things.';
    goal_two := 'Children will recognise that creation shows God''s power, wisdom, and goodness.';
    goal_three := 'Children will see that the world belongs to God and should be received with thankfulness.';
    outcome_text := 'Children can retell what God made in this part of creation and explain why God alone deserves worship as Creator.';
  elsif lesson_scripture like 'Genesis 2:%' then
    focus_text := 'This lesson highlights God''s good design for people, work, rest, and relationships. Children will see that God made humanity with dignity, purpose, and dependence on Him.';
    goal_one := 'Children will understand that God made people in a special and purposeful way.';
    goal_two := 'Children will identify how God provides what people need in His good creation.';
    goal_three := 'Children will see that living God''s way is good and wise.';
    outcome_text := 'Children can describe God''s good design in the passage and share one way His pattern for life is good for His people.';
  elsif lesson_scripture like 'Genesis 3:%' then
    focus_text := 'This lesson shows how sin entered the world through human rebellion and brought shame, fear, and judgment. Children will also see that God gave hope by promising a Rescuer.';
    goal_one := 'Children will understand that sin is rejecting God''s good word.';
    goal_two := 'Children will recognise the sad results of sin in the world.';
    goal_three := 'Children will see that God is gracious because He promised salvation even after the fall.';
    outcome_text := 'Children can retell how sin entered the world and explain why God''s promise of a Saviour gives hope.';
  elsif lesson_scripture like 'Genesis 4:%' then
    focus_text := 'This lesson shows that sin spreads deeply through human hearts and relationships. Children will see the seriousness of sin and the need for God''s mercy.';
    goal_one := 'Children will understand that sin affects the way people treat God and each other.';
    goal_two := 'Children will recognise the danger of unchecked anger, pride, and rebellion.';
    goal_three := 'Children will see their need for God''s grace and forgiveness.';
    outcome_text := 'Children can retell the key events of the passage and explain why sin must be taken seriously before God.';
  elsif lesson_scripture like 'Genesis 6:%' or lesson_scripture like 'Genesis 8:%' or lesson_scripture like 'Genesis 9:%' then
    focus_text := 'This lesson shows both God''s holy judgment against sin and His mercy in saving people according to His promise. Children will see that God is righteous, faithful, and gracious.';
    goal_one := 'Children will understand that God judges sin because He is holy.';
    goal_two := 'Children will recognise that God provides salvation according to His word.';
    goal_three := 'Children will see that God keeps His covenant promises.';
    outcome_text := 'Children can retell how God showed both justice and mercy and explain why His promises can be trusted.';
  elsif lesson_scripture like 'Genesis 12:%' or lesson_scripture like 'Genesis 15:%' or lesson_scripture like 'Genesis 17:%' or lesson_scripture like 'Genesis 21:%' or lesson_scripture like 'Genesis 22:%' then
    focus_text := 'This lesson shows how God calls Abraham''s family and gives covenant promises that shape His plan of salvation. Children will see that God''s promises are received by faith and point forward to blessing for all nations.';
    goal_one := 'Children will understand that God makes and keeps His promises.';
    goal_two := 'Children will recognise that faith means trusting God''s word even when the future is unclear.';
    goal_three := 'Children will see that God''s plan is bigger than one family and reaches to all nations.';
    outcome_text := 'Children can retell the promise in the passage and explain why God''s people should trust His covenant word.';
  elsif lesson_scripture like 'Genesis 28:%' or lesson_scripture like 'Genesis 32:%' then
    focus_text := 'This lesson shows that God remains faithful to His covenant people even when they are weak, fearful, or struggling. Children will see that God keeps working in His people to shape them for His purposes.';
    goal_one := 'Children will understand that God does not abandon His people.';
    goal_two := 'Children will recognise that God changes hearts and strengthens faith.';
    goal_three := 'Children will see that belonging to God means depending on His grace.';
    outcome_text := 'Children can retell the encounter in the passage and explain how God stayed faithful to His covenant promises.';
  elsif lesson_scripture like 'Genesis 37:%' or lesson_scripture like 'Genesis 39:%' or lesson_scripture like 'Genesis 45:%' then
    focus_text := 'This lesson shows that God is at work even through suffering, injustice, and family failure. Children will see that God''s good purposes continue even when life is hard.';
    goal_one := 'Children will understand that God is sovereign over hard and confusing circumstances.';
    goal_two := 'Children will recognise that God can bring good from what others mean for evil.';
    goal_three := 'Children will see examples of faith, forgiveness, and perseverance.';
    outcome_text := 'Children can retell the main events of the story and explain how God''s good plan was still at work.';
  elsif lesson_scripture like 'Exodus 1:%' or lesson_scripture like 'Exodus 2:%' or lesson_scripture like 'Exodus 3:%' or lesson_scripture like 'Exodus 5:%' or lesson_scripture like 'Exodus 14:%' then
    focus_text := 'This lesson shows that God hears the cries of His people, raises a deliverer, and acts powerfully to save. Children will see that God is faithful, mighty, and worthy of trust.';
    goal_one := 'Children will understand that God remembers His people and His promises.';
    goal_two := 'Children will recognise that God has power to rescue and save.';
    goal_three := 'Children will see that faithful obedience begins with trusting God''s word.';
    outcome_text := 'Children can retell how God acted to save His people and explain why His power and faithfulness give courage.';
  elsif lesson_scripture like 'Psalm 19:%' or lesson_scripture like 'Psalm 104:%' or lesson_scripture like 'Psalm 24:%' or lesson_scripture like 'Isaiah 43:%' or lesson_scripture like 'Colossians 1:%' then
    focus_text := 'This lesson celebrates God''s glory, rule, and wisdom as seen in creation and in His Son. Children will see that all things exist for God and point to His greatness.';
    goal_one := 'Children will understand that creation reveals God''s glory and authority.';
    goal_two := 'Children will recognise that all the earth belongs to God.';
    goal_three := 'Children will see that the right response to God''s greatness is worship and trust.';
    outcome_text := 'Children can explain what the passage shows about God''s glory and give one reason He deserves praise.';
  elsif lesson_scripture like 'John 1:%' then
    focus_text := 'This lesson shows that Jesus is the eternal Son of God who came into the world as the Word made flesh. Children will see that Jesus brings life, light, and grace to sinners.';
    goal_one := 'Children will understand that Jesus is fully God and truly came into the world.';
    goal_two := 'Children will recognise that Jesus reveals God perfectly.';
    goal_three := 'Children will see that true life and light are found in Christ alone.';
    outcome_text := 'Children can retell what the passage says about Jesus and explain why He is worthy of trust and worship.';
  elsif lesson_scripture like 'John 2:%' then
    focus_text := 'This lesson shows Jesus'' authority and glory through His first sign and through His zeal for His Father''s house. Children will see that Jesus is the promised Messiah who acts with holy power.';
    goal_one := 'Children will understand that Jesus performs signs that reveal His glory.';
    goal_two := 'Children will recognise that Jesus has authority over worship and over people''s lives.';
    goal_three := 'Children will see that Jesus calls for real faith, not shallow excitement.';
    outcome_text := 'Children can retell the sign or action in the passage and explain what it teaches about Jesus'' authority and glory.';
  elsif lesson_scripture like 'John 3:%' then
    focus_text := 'This lesson shows that people need new life from above and that salvation comes through believing in God''s Son. Children will see that Jesus alone brings eternal life.';
    goal_one := 'Children will understand that no one can save themselves by effort or religion.';
    goal_two := 'Children will recognise that eternal life comes through faith in Jesus.';
    goal_three := 'Children will see the greatness of God''s love in sending His Son.';
    outcome_text := 'Children can explain the main message of the passage and share why trusting Jesus is the only way to new life.';
  elsif lesson_scripture like 'John 4:%' then
    focus_text := 'This lesson shows Jesus reaching needy people with truth, grace, and living water. Children will see that Jesus satisfies the deepest thirst of the heart and brings people into God''s family.';
    goal_one := 'Children will understand that Jesus welcomes sinners and outsiders with grace.';
    goal_two := 'Children will recognise that only Jesus gives living water and true life.';
    goal_three := 'Children will see that people who meet Jesus are moved to tell others about Him.';
    outcome_text := 'Children can retell how Jesus met someone in need and explain why He is the source of lasting life and hope.';
  elsif lesson_scripture like 'John 5:%' then
    focus_text := 'This lesson shows Jesus'' authority over sickness, the Sabbath, and life itself. Children will see that the Son has power to heal, judge, and give life according to the Father''s will.';
    goal_one := 'Children will understand that Jesus has divine authority.';
    goal_two := 'Children will recognise that Jesus gives life and deserves honour equal to the Father.';
    goal_three := 'Children will see that people must respond seriously to Jesus'' words.';
    outcome_text := 'Children can retell the healing or teaching in the passage and explain what it reveals about Jesus'' authority and power.';
  elsif lesson_scripture like 'John 6:%' then
    focus_text := 'This lesson shows Jesus providing for people in their need and revealing Himself as the true bread from heaven. Children will see that Jesus cares for people and gives life that lasts forever.';
    goal_one := 'Children will understand that Jesus is compassionate and powerful.';
    goal_two := 'Children will recognise that physical needs point to the deeper need for spiritual life.';
    goal_three := 'Children will see that Jesus alone truly satisfies His people.';
    outcome_text := 'Children can retell how Jesus provided and explain why He is the one who gives lasting life.';
  elsif lesson_scripture like 'John 7:%' or lesson_scripture like 'John 8:%' then
    focus_text := 'This lesson shows Jesus teaching boldly, exposing unbelief, and calling people to receive God''s truth. Children will see that His words bring light, freedom, and life to those who believe.';
    goal_one := 'Children will understand that Jesus teaches God''s truth with authority.';
    goal_two := 'Children will recognise that unbelief resists Jesus even when the truth is clear.';
    goal_three := 'Children will see that following Jesus means walking in His light and word.';
    outcome_text := 'Children can retell the key teaching from the passage and explain how Jesus calls people to faith, truth, and obedience.';
  elsif lesson_scripture like 'John 9:%' then
    focus_text := 'This lesson shows Jesus giving sight to the blind and exposing spiritual blindness in those who reject Him. Children will see that Jesus opens eyes physically and spiritually.';
    goal_one := 'Children will understand that Jesus has power to bring healing and light.';
    goal_two := 'Children will recognise the difference between humble faith and stubborn unbelief.';
    goal_three := 'Children will see that true sight means recognising Jesus for who He is.';
    outcome_text := 'Children can retell the healing in the passage and explain why trusting Jesus leads to true sight.';
  elsif lesson_scripture like 'John 10:%' then
    focus_text := 'This lesson shows Jesus as the Good Shepherd who knows, protects, and lays down His life for His sheep. Children will see that His people are safe and secure in His care.';
    goal_one := 'Children will understand that Jesus lovingly leads and guards His people.';
    goal_two := 'Children will recognise that Jesus willingly gave His life for His sheep.';
    goal_three := 'Children will see that hearing and following Jesus is the mark of His people.';
    outcome_text := 'Children can explain what makes Jesus the Good Shepherd and describe how His sheep respond to Him.';
  elsif lesson_scripture like 'John 11:%' then
    focus_text := 'This lesson shows Jesus'' compassion in sorrow and His power over death. Children will see that Jesus is the resurrection and the life, giving hope that reaches beyond the grave.';
    goal_one := 'Children will understand that Jesus cares deeply for people in sadness and loss.';
    goal_two := 'Children will recognise that Jesus has authority even over death.';
    goal_three := 'Children will see that true hope is found in Christ alone.';
    outcome_text := 'Children can retell what Jesus did in the passage and explain why He gives real hope in life and death.';
  elsif lesson_scripture like 'John 12:%' then
    focus_text := 'This lesson shows Jesus moving toward the cross while calling people to honour Him, believe in Him, and understand His mission. Children will see that Jesus came to save through humble obedience.';
    goal_one := 'Children will understand that Jesus came to bring salvation through His death and glory.';
    goal_two := 'Children will recognise different responses people had to Jesus.';
    goal_three := 'Children will see that the right response is faith, worship, and wholehearted trust.';
    outcome_text := 'Children can retell the key scene or teaching and explain how it points to Jesus'' saving mission.';
  elsif lesson_scripture like 'John 13:%' then
    focus_text := 'This lesson shows Jesus loving His disciples to the end and teaching them to serve one another with humility. Children will see that true greatness in God''s kingdom looks like humble love.';
    goal_one := 'Children will understand that Jesus leads by loving service.';
    goal_two := 'Children will recognise that Christians are called to love one another in the same spirit.';
    goal_three := 'Children will see that serving others reflects the heart of Jesus.';
    outcome_text := 'Children can retell what Jesus did for His disciples and identify one way they can show humble love to others.';
  elsif lesson_scripture like 'John 14:%' or lesson_scripture like 'John 15:%' or lesson_scripture like 'John 16:%' or lesson_scripture like 'John 17:%' then
    focus_text := 'This lesson shows Jesus preparing His disciples with comfort, promises, prayer, and the gift of the Holy Spirit. Children will see that His followers are not left alone but are helped to remain in Him.';
    goal_one := 'Children will understand that Jesus lovingly prepares and strengthens His people.';
    goal_two := 'Children will recognise the work of the Holy Spirit in guiding, helping, and comforting believers.';
    goal_three := 'Children will see that staying close to Jesus brings peace, fruit, and confidence.';
    outcome_text := 'Children can explain one promise Jesus gives His followers and describe how that promise helps believers trust Him today.';
  elsif lesson_scripture like 'John 20:%' then
    focus_text := 'This lesson shows the risen Jesus bringing peace, joy, and mission to His followers. Children will see that because Jesus is alive, His people are sent into the world with courage.';
    goal_one := 'Children will understand that Jesus truly rose from the dead.';
    goal_two := 'Children will recognise that the risen Jesus brings peace and purpose.';
    goal_three := 'Children will see that followers of Jesus are sent to serve and witness for Him.';
    outcome_text := 'Children can retell the appearance of the risen Jesus and explain how His resurrection gives courage and mission.';
  elsif lesson_scripture like 'Matthew 4:%' or lesson_scripture like 'Mark 3:%' then
    focus_text := 'This lesson shows Jesus calling ordinary people to follow Him. Children will see that Jesus chooses, teaches, and shapes His disciples for His purposes.';
    goal_one := 'Children will understand that Jesus calls people to follow Him personally.';
    goal_two := 'Children will recognise that discipleship begins with trusting and obeying Jesus.';
    goal_three := 'Children will see that Jesus can use ordinary people in extraordinary ways.';
    outcome_text := 'Children can retell how Jesus called His followers and explain what it means to follow Him today.';
  elsif lesson_scripture like 'Matthew 5:%' or lesson_scripture like 'Matthew 6:%' or lesson_scripture like 'Mark 10:42-45' then
    focus_text := 'This lesson shows Jesus teaching His followers about life in God''s kingdom. Children will see that Jesus shapes the hearts, attitudes, and actions of those who belong to Him.';
    goal_one := 'Children will understand that Jesus teaches with authority and wisdom.';
    goal_two := 'Children will recognise that following Jesus affects the whole of life.';
    goal_three := 'Children will see that God cares about both outward actions and inward hearts.';
    outcome_text := 'Children can retell the main teaching in the passage and explain one way Jesus wants His followers to live.';
  elsif lesson_scripture like 'Matthew 10:%' or lesson_scripture like 'Matthew 28:%' or lesson_scripture like 'Acts 1:%' then
    focus_text := 'This lesson shows Jesus sending His followers with His authority and mission. Children will see that God equips His people to speak, serve, and witness in His name.';
    goal_one := 'Children will understand that Jesus gives His followers a mission.';
    goal_two := 'Children will recognise that God equips His people through His presence and Spirit.';
    goal_three := 'Children will see that Christians are called to help others know Jesus.';
    outcome_text := 'Children can explain the mission Jesus gives His people and share one way they can witness for Him.';
  elsif lesson_scripture like 'Matthew 14:%' or lesson_scripture like 'Mark 4:%' or lesson_scripture like 'Mark 10:13-16' then
    focus_text := 'This lesson shows Jesus'' compassion, welcome, and power in the lives of people around Him. Children will see that Jesus is trustworthy, kind, and worthy of faith.';
    goal_one := 'Children will understand that Jesus cares personally for people in need.';
    goal_two := 'Children will recognise that Jesus has power over danger, fear, and weakness.';
    goal_three := 'Children will see that the right response to Jesus is trust and dependence.';
    outcome_text := 'Children can retell what Jesus did in the passage and explain how His care and power encourage people to trust Him.';
  elsif lesson_scripture like 'Luke 1:%' or lesson_scripture like 'Luke 2:%' or lesson_scripture like 'Luke 9:%' then
    focus_text := 'This lesson shows God keeping His promises through the coming and work of Jesus. Children will see that Jesus is the promised Saviour who calls for joyful faith and willing obedience.';
    goal_one := 'Children will understand that Jesus'' coming fulfils God''s long-promised plan.';
    goal_two := 'Children will recognise that God''s salvation should lead to wonder, joy, and faith.';
    goal_three := 'Children will see that following Jesus means trusting Him and listening to His call.';
    outcome_text := 'Children can retell the key events of the passage and explain how they show God keeping His promises in Jesus.';
  elsif lesson_scripture like 'Romans 5:%' then
    focus_text := 'This lesson shows that sin came through Adam, but grace and life come through Jesus Christ. Children will see the greatness of God''s rescue in the gospel.';
    goal_one := 'Children will understand the problem of sin and the hope of grace.';
    goal_two := 'Children will recognise that Jesus succeeds where Adam failed.';
    goal_three := 'Children will see that eternal life is God''s gift through Christ.';
    outcome_text := 'Children can explain the contrast between Adam and Jesus and share why God''s grace in Christ is such good news.';
  elsif lesson_scripture like 'Acts 2:%' then
    focus_text := 'This lesson shows the Holy Spirit empowering the early believers and Peter boldly preaching the good news about Jesus. Children will see that God builds His church through His word and Spirit.';
    goal_one := 'Children will understand that the Holy Spirit gives power for witness.';
    goal_two := 'Children will recognise that the message of Jesus brings repentance, forgiveness, and new life.';
    goal_three := 'Children will see that God gathers His people into a joyful, learning, sharing church.';
    outcome_text := 'Children can retell what happened at Pentecost or in Peter''s preaching and explain why the gospel changes lives.';
  elsif lesson_scripture like 'Acts 3:%' or lesson_scripture like 'Acts 4:%' then
    focus_text := 'This lesson shows the early disciples speaking and acting in the name of Jesus with courage, compassion, and boldness. Children will see that God works through His people to bless others and proclaim Christ.';
    goal_one := 'Children will understand that the apostles depended on Jesus'' power, not their own.';
    goal_two := 'Children will recognise that opposition does not stop God''s mission.';
    goal_three := 'Children will see that bold witness grows from confidence in the risen Jesus.';
    outcome_text := 'Children can retell the miracle or message in the passage and explain how the disciples showed courage in Jesus'' name.';
  elsif lesson_scripture like 'Acts 8:%' or lesson_scripture like 'Acts 9:%' or lesson_scripture like 'Acts 10:%' or lesson_scripture like 'Acts 11:%' then
    focus_text := 'This lesson shows the gospel spreading beyond old boundaries as God saves, transforms, and sends people from many backgrounds. Children will see that Jesus continues His work through obedient disciples.';
    goal_one := 'Children will understand that the gospel is for all kinds of people.';
    goal_two := 'Children will recognise that God changes lives and uses His people in mission.';
    goal_three := 'Children will see that faithful obedience helps God''s kingdom spread.';
    outcome_text := 'Children can retell how God worked through His people in the passage and explain how the good news keeps spreading.';
  end if;

  return
    '<h2>Lesson Title / Theme</h2>' ||
    '<p><strong>' || coalesce(theme_text, 'Bible Lesson') || '</strong></p>' ||
    '<h2>Focus</h2>' ||
    '<p>' || focus_text || '</p>' ||
    '<h2>Goals</h2>' ||
    '<ul>' ||
    '<li>' || goal_one || '</li>' ||
    '<li>' || goal_two || '</li>' ||
    '<li>' || goal_three || '</li>' ||
    '</ul>' ||
    '<h2>Outcome</h2>' ||
    '<p>' || outcome_text || '</p>';
end;
$$;

update nck.resources
set description = nck.build_curriculum_lesson_content(title, scripture)
where year_cycle in ('Year A', 'Year B', 'Year C');

commit;
