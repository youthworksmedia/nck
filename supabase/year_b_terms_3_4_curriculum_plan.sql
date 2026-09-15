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
    ('Jesus Turns Water into Wine', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 1, 'John 2:1-11', 'Curriculum', 'Year B', 'Term 3', '', ''),
    ('Jesus Clears the Temple', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', 2, 'John 2:12-25', 'Curriculum', 'Year B', 'Term 3', '', ''),
    ('Jesus Teaches Nicodemus', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', 3, 'John 3:1-15', 'Curriculum', 'Year B', 'Term 3', '', ''),
    ('God So Loved the World', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 4, 'John 3:16-21', 'Curriculum', 'Year B', 'Term 3', '', ''),
    ('Jesus and the Samaritan Woman', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.', 5, 'John 4:1-15', 'Curriculum', 'Year B', 'Term 3', '', ''),
    ('Living Water for Thirsty Hearts', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.', 6, 'John 4:13-26', 'Curriculum', 'Year B', 'Term 3', '', ''),
    ('Many Samaritans Believe', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.', 7, 'John 4:27-42', 'Curriculum', 'Year B', 'Term 3', '', ''),
    ('Jesus Heals the Official''s Son', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.', 8, 'John 4:46-54', 'Curriculum', 'Year B', 'Term 3', '', ''),
    ('Jesus Heals at Bethesda', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.', 9, 'John 5:1-18', 'Curriculum', 'Year B', 'Term 3', '', ''),
    ('The Son Gives Life', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium.', 10, 'John 5:19-29', 'Curriculum', 'Year B', 'Term 3', '', ''),
    ('Jesus Opens Blind Eyes', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et harum quidem rerum facilis est et expedita distinctio.', 11, 'John 9:1-12', 'Curriculum', 'Year B', 'Term 3', '', ''),
    ('Jesus the Good Shepherd', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.', 12, 'John 10:1-21', 'Curriculum', 'Year B', 'Term 3', '', ''),
    ('Jesus Weeps for Lazarus', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.', 13, 'John 11:1-37', 'Curriculum', 'Year B', 'Term 3', '', ''),
    ('Jesus Raises Lazarus', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores.', 14, 'John 11:38-44', 'Curriculum', 'Year B', 'Term 3', '', ''),

    ('Jesus Goes to the Festival', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 1, 'John 7:1-24', 'Curriculum', 'Year B', 'Term 4', '', ''),
    ('Rivers of Living Water', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', 2, 'John 7:25-39', 'Curriculum', 'Year B', 'Term 4', '', ''),
    ('People Are Divided About Jesus', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', 3, 'John 7:40-52', 'Curriculum', 'Year B', 'Term 4', '', ''),
    ('Go and Leave Your Life of Sin', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 4, 'John 8:1-11', 'Curriculum', 'Year B', 'Term 4', '', ''),
    ('Jesus the Light of the World', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.', 5, 'John 8:12-20', 'Curriculum', 'Year B', 'Term 4', '', ''),
    ('The Truth Will Set You Free', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.', 6, 'John 8:21-36', 'Curriculum', 'Year B', 'Term 4', '', ''),
    ('The Healed Man Speaks Boldly', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.', 7, 'John 9:13-34', 'Curriculum', 'Year B', 'Term 4', '', ''),
    ('My Sheep Hear My Voice', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.', 8, 'John 10:22-30', 'Curriculum', 'Year B', 'Term 4', '', ''),
    ('Many Believe in Jesus', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.', 9, 'John 10:40-42', 'Curriculum', 'Year B', 'Term 4', '', ''),
    ('The Leaders Plot Against Jesus', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium.', 10, 'John 11:45-57', 'Curriculum', 'Year B', 'Term 4', '', ''),
    ('Mary Anoints Jesus', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et harum quidem rerum facilis est et expedita distinctio.', 11, 'John 12:1-11', 'Curriculum', 'Year B', 'Term 4', '', ''),
    ('Jesus Enters Jerusalem', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.', 12, 'John 12:12-19', 'Curriculum', 'Year B', 'Term 4', '', ''),
    ('Jesus Speaks About His Mission', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.', 13, 'John 12:20-36', 'Curriculum', 'Year B', 'Term 4', '', ''),
    ('Believe in the Light', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores.', 14, 'John 12:37-50', 'Curriculum', 'Year B', 'Term 4', '', '')
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
