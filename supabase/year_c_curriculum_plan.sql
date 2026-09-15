begin;

create schema if not exists nck;

with lessons (
  title,
  description,
  lesson_number,
  scripture,
  category,
  year_cycle,
  term,
  format,
  file_url
) as (
  values
    ('Jesus Calls His First Disciples', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 1, 'Matthew 4:18-22', 'Curriculum', 'Year C', 'Term 1', '', ''),
    ('Jesus Chooses the Twelve', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', 2, 'Mark 3:13-19', 'Curriculum', 'Year C', 'Term 1', '', ''),
    ('Jesus Teaches the Beatitudes', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', 3, 'Matthew 5:1-12', 'Curriculum', 'Year C', 'Term 1', '', ''),
    ('Jesus Teaches About Prayer', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 4, 'Matthew 6:5-13', 'Curriculum', 'Year C', 'Term 1', '', ''),
    ('Jesus Calms the Storm with His Disciples', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.', 5, 'Mark 4:35-41', 'Curriculum', 'Year C', 'Term 1', '', ''),
    ('Jesus Feeds the Five Thousand', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.', 6, 'John 6:1-14', 'Curriculum', 'Year C', 'Term 1', '', ''),
    ('Jesus Walks on Water', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.', 7, 'Matthew 14:22-33', 'Curriculum', 'Year C', 'Term 1', '', ''),
    ('Jesus Welcomes Children', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.', 8, 'Mark 10:13-16', 'Curriculum', 'Year C', 'Term 1', '', ''),
    ('Jesus Washes His Disciples’ Feet', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.', 9, 'John 13:1-17', 'Curriculum', 'Year C', 'Term 1', '', ''),
    ('Jesus Gives a New Command', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium.', 10, 'John 13:31-35', 'Curriculum', 'Year C', 'Term 1', '', ''),
    ('Jesus Comforts His Friends', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et harum quidem rerum facilis est et expedita distinctio.', 11, 'John 14:1-6', 'Curriculum', 'Year C', 'Term 1', '', ''),
    ('Jesus Promises Peace', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.', 12, 'John 14:25-31', 'Curriculum', 'Year C', 'Term 1', '', ''),
    ('Abide in Jesus’ Love', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.', 13, 'John 15:1-11', 'Curriculum', 'Year C', 'Term 1', '', ''),

    ('Jesus Sends His Disciples', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 1, 'Matthew 10:1-8', 'Curriculum', 'Year C', 'Term 2', '', ''),
    ('Jesus Teaches About Serving Others', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', 2, 'Mark 10:42-45', 'Curriculum', 'Year C', 'Term 2', '', ''),
    ('Jesus Promises the Holy Spirit', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', 3, 'John 14:15-21', 'Curriculum', 'Year C', 'Term 2', '', ''),
    ('The Helper Will Teach You', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 4, 'John 14:22-31', 'Curriculum', 'Year C', 'Term 2', '', ''),
    ('Jesus Says the Spirit Will Testify', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.', 5, 'John 15:26-27', 'Curriculum', 'Year C', 'Term 2', '', ''),
    ('The Spirit Will Guide You', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.', 6, 'John 16:7-15', 'Curriculum', 'Year C', 'Term 2', '', ''),
    ('Jesus Prays for His Followers', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.', 7, 'John 17:6-19', 'Curriculum', 'Year C', 'Term 2', '', ''),
    ('The Risen Jesus Sends His People', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.', 8, 'John 20:19-23', 'Curriculum', 'Year C', 'Term 2', '', ''),
    ('The Great Commission', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.', 9, 'Matthew 28:16-20', 'Curriculum', 'Year C', 'Term 2', '', ''),
    ('Wait for the Promise of the Father', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium.', 10, 'Acts 1:1-8', 'Curriculum', 'Year C', 'Term 2', '', ''),
    ('Jesus Ascends to Heaven', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et harum quidem rerum facilis est et expedita distinctio.', 11, 'Acts 1:9-11', 'Curriculum', 'Year C', 'Term 2', '', ''),
    ('The Disciples Pray Together', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.', 12, 'Acts 1:12-14', 'Curriculum', 'Year C', 'Term 2', '', ''),
    ('Power to Be Witnesses', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.', 13, 'Acts 1:8', 'Curriculum', 'Year C', 'Term 2', '', ''),

    ('The Holy Spirit Comes at Pentecost', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 1, 'Acts 2:1-13', 'Curriculum', 'Year C', 'Term 3', '', ''),
    ('Peter Explains the Good News', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', 2, 'Acts 2:14-24', 'Curriculum', 'Year C', 'Term 3', '', ''),
    ('Jesus Is Lord and Christ', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', 3, 'Acts 2:25-36', 'Curriculum', 'Year C', 'Term 3', '', ''),
    ('Repent and Be Baptized', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 4, 'Acts 2:37-41', 'Curriculum', 'Year C', 'Term 3', '', ''),
    ('The Believers Share Life Together', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.', 5, 'Acts 2:42-47', 'Curriculum', 'Year C', 'Term 3', '', ''),
    ('A Lame Man Is Healed', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.', 6, 'Acts 3:1-10', 'Curriculum', 'Year C', 'Term 3', '', ''),
    ('Peter Points to Jesus', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.', 7, 'Acts 3:11-16', 'Curriculum', 'Year C', 'Term 3', '', ''),
    ('Turn Back to God', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.', 8, 'Acts 3:17-26', 'Curriculum', 'Year C', 'Term 3', '', ''),
    ('Peter and John Are Arrested', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.', 9, 'Acts 4:1-4', 'Curriculum', 'Year C', 'Term 3', '', ''),
    ('Salvation in No One Else', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium.', 10, 'Acts 4:5-12', 'Curriculum', 'Year C', 'Term 3', '', ''),
    ('Bold Before the Council', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et harum quidem rerum facilis est et expedita distinctio.', 11, 'Acts 4:13-22', 'Curriculum', 'Year C', 'Term 3', '', ''),
    ('Believers Pray for Boldness', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.', 12, 'Acts 4:23-31', 'Curriculum', 'Year C', 'Term 3', '', ''),
    ('The Church Lives with Generosity', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.', 13, 'Acts 4:32-37', 'Curriculum', 'Year C', 'Term 3', '', ''),

    ('The Church Scatters and Preaches', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 1, 'Acts 8:4-8', 'Curriculum', 'Year C', 'Term 4', '', ''),
    ('Simon Hears the Gospel', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', 2, 'Acts 8:9-13', 'Curriculum', 'Year C', 'Term 4', '', ''),
    ('The Spirit Comes to Samaria', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', 3, 'Acts 8:14-17', 'Curriculum', 'Year C', 'Term 4', '', ''),
    ('God Cannot Be Bought', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 4, 'Acts 8:18-25', 'Curriculum', 'Year C', 'Term 4', '', ''),
    ('Saul Meets the Risen Jesus', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.', 5, 'Acts 9:1-9', 'Curriculum', 'Year C', 'Term 4', '', ''),
    ('Ananias Obeys God', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.', 6, 'Acts 9:10-19', 'Curriculum', 'Year C', 'Term 4', '', ''),
    ('Saul Begins to Preach', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.', 7, 'Acts 9:20-22', 'Curriculum', 'Year C', 'Term 4', '', ''),
    ('Cornelius Seeks God', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.', 8, 'Acts 10:1-8', 'Curriculum', 'Year C', 'Term 4', '', ''),
    ('Peter’s Vision from God', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.', 9, 'Acts 10:9-23', 'Curriculum', 'Year C', 'Term 4', '', ''),
    ('God Shows No Favouritism', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium.', 10, 'Acts 10:24-35', 'Curriculum', 'Year C', 'Term 4', '', ''),
    ('Peter Tells the Good News', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et harum quidem rerum facilis est et expedita distinctio.', 11, 'Acts 10:36-43', 'Curriculum', 'Year C', 'Term 4', '', ''),
    ('The Holy Spirit Comes to the Gentiles', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.', 12, 'Acts 10:44-48', 'Curriculum', 'Year C', 'Term 4', '', ''),
    ('God’s Kingdom Keeps Growing', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.', 13, 'Acts 11:18-21', 'Curriculum', 'Year C', 'Term 4', '', '')
)
insert into nck.resources (
  title,
  description,
  lesson_number,
  scripture,
  category,
  year_cycle,
  term,
  format,
  file_url
)
select
  title,
  description,
  lesson_number,
  scripture,
  category,
  year_cycle,
  term,
  format,
  file_url
from lessons
where not exists (
  select 1
  from nck.resources existing
  where existing.title = lessons.title
    and existing.year_cycle = lessons.year_cycle
    and existing.term = lessons.term
);

commit;
