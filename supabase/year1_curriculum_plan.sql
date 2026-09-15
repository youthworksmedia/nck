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
    ('God Made Everything', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 1, 'Genesis 1:1-5', 'Curriculum', 'Year A', 'Term 1', '', ''),
    ('God Fills the Skies and Seas', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', 2, 'Genesis 1:6-13', 'Curriculum', 'Year A', 'Term 1', '', ''),
    ('God Made the Sun, Moon and Stars', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', 3, 'Genesis 1:14-19', 'Curriculum', 'Year A', 'Term 1', '', ''),
    ('God Made Living Creatures', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 4, 'Genesis 1:20-25', 'Curriculum', 'Year A', 'Term 1', '', ''),
    ('Made in God''s Image', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.', 5, 'Genesis 1:26-31', 'Curriculum', 'Year A', 'Term 1', '', ''),
    ('God Rested on the Seventh Day', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.', 6, 'Genesis 2:1-3', 'Curriculum', 'Year A', 'Term 1', '', ''),
    ('The Garden God Prepared', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.', 7, 'Genesis 2:4-14', 'Curriculum', 'Year A', 'Term 1', '', ''),
    ('God Gave Adam Work to Do', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.', 8, 'Genesis 2:15-17', 'Curriculum', 'Year A', 'Term 1', '', ''),
    ('God Made a Helper for Adam', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.', 9, 'Genesis 2:18-25', 'Curriculum', 'Year A', 'Term 1', '', ''),
    ('The Heavens Declare God''s Glory', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium.', 10, 'Psalm 19:1-4', 'Curriculum', 'Year A', 'Term 1', '', ''),
    ('Creation Shows God''s Wisdom', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et harum quidem rerum facilis est et expedita distinctio.', 11, 'Psalm 104:24-30', 'Curriculum', 'Year A', 'Term 1', '', ''),
    ('All Things Were Made by God', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.', 12, 'Colossians 1:15-17', 'Curriculum', 'Year A', 'Term 1', '', ''),
    ('God Owns the Whole Earth', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.', 13, 'Psalm 24:1-2', 'Curriculum', 'Year A', 'Term 1', '', ''),
    ('Created for God''s Glory', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores.', 14, 'Isaiah 43:6-7', 'Curriculum', 'Year A', 'Term 1', '', ''),

    ('The Serpent''s Lie', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 1, 'Genesis 3:1-5', 'Curriculum', 'Year A', 'Term 2', '', ''),
    ('Adam and Eve Disobey', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', 2, 'Genesis 3:6-8', 'Curriculum', 'Year A', 'Term 2', '', ''),
    ('Sin Brings Shame and Fear', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', 3, 'Genesis 3:9-13', 'Curriculum', 'Year A', 'Term 2', '', ''),
    ('God Judges Sin', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 4, 'Genesis 3:14-19', 'Curriculum', 'Year A', 'Term 2', '', ''),
    ('God Promises a Saviour', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.', 5, 'Genesis 3:15', 'Curriculum', 'Year A', 'Term 2', '', ''),
    ('Sent Out of the Garden', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.', 6, 'Genesis 3:20-24', 'Curriculum', 'Year A', 'Term 2', '', ''),
    ('Sin Spreads in Cain and Abel', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.', 7, 'Genesis 4:1-16', 'Curriculum', 'Year A', 'Term 2', '', ''),
    ('Noah Found Favour', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.', 8, 'Genesis 6:5-9', 'Curriculum', 'Year A', 'Term 2', '', ''),
    ('God Keeps Noah Safe', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.', 9, 'Genesis 8:15-22', 'Curriculum', 'Year A', 'Term 2', '', ''),
    ('God''s Promise in the Rainbow', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium.', 10, 'Genesis 9:8-17', 'Curriculum', 'Year A', 'Term 2', '', ''),
    ('God Calls Abram', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et harum quidem rerum facilis est et expedita distinctio.', 11, 'Genesis 12:1-3', 'Curriculum', 'Year A', 'Term 2', '', ''),
    ('Abram Trusts God''s Promise', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.', 12, 'Genesis 12:4-9', 'Curriculum', 'Year A', 'Term 2', '', ''),
    ('God Counts Abram''s Faith', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.', 13, 'Genesis 15:1-6', 'Curriculum', 'Year A', 'Term 2', '', ''),
    ('Blessing for All Nations', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores.', 14, 'Genesis 22:15-18', 'Curriculum', 'Year A', 'Term 2', '', ''),

    ('God''s Promise to Abraham', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 1, 'Genesis 12:1-7', 'Curriculum', 'Year A', 'Term 3', '', ''),
    ('God Keeps His Covenant', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', 2, 'Genesis 17:1-8', 'Curriculum', 'Year A', 'Term 3', '', ''),
    ('Isaac the Promised Son', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', 3, 'Genesis 21:1-7', 'Curriculum', 'Year A', 'Term 3', '', ''),
    ('God Provides the Ram', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 4, 'Genesis 22:1-14', 'Curriculum', 'Year A', 'Term 3', '', ''),
    ('God Blesses Jacob', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.', 5, 'Genesis 28:10-17', 'Curriculum', 'Year A', 'Term 3', '', ''),
    ('God Renames Israel', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.', 6, 'Genesis 32:22-30', 'Curriculum', 'Year A', 'Term 3', '', ''),
    ('Joseph''s Dreams', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.', 7, 'Genesis 37:1-11', 'Curriculum', 'Year A', 'Term 3', '', ''),
    ('God Is with Joseph', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.', 8, 'Genesis 39:1-6', 'Curriculum', 'Year A', 'Term 3', '', ''),
    ('Joseph Forgives His Brothers', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.', 9, 'Genesis 45:1-8', 'Curriculum', 'Year A', 'Term 3', '', ''),
    ('A New King in Egypt', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium.', 10, 'Exodus 1:8-14', 'Curriculum', 'Year A', 'Term 3', '', ''),
    ('God Saves Baby Moses', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et harum quidem rerum facilis est et expedita distinctio.', 11, 'Exodus 2:1-10', 'Curriculum', 'Year A', 'Term 3', '', ''),
    ('God Speaks from the Burning Bush', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.', 12, 'Exodus 3:1-10', 'Curriculum', 'Year A', 'Term 3', '', ''),
    ('Let My People Go', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.', 13, 'Exodus 5:1-2', 'Curriculum', 'Year A', 'Term 3', '', ''),
    ('God Delivers Through the Sea', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores.', 14, 'Exodus 14:21-31', 'Curriculum', 'Year A', 'Term 3', '', ''),

    ('The Word Became Flesh', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 1, 'John 1:1-5, 14', 'Curriculum', 'Year A', 'Term 4', '', ''),
    ('Jesus Is the Light', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', 2, 'John 1:6-13', 'Curriculum', 'Year A', 'Term 4', '', ''),
    ('The Angel Visits Mary', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', 3, 'Luke 1:26-38', 'Curriculum', 'Year A', 'Term 4', '', ''),
    ('Mary Praises God', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 4, 'Luke 1:46-55', 'Curriculum', 'Year A', 'Term 4', '', ''),
    ('Jesus Is Born', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.', 5, 'Luke 2:1-7', 'Curriculum', 'Year A', 'Term 4', '', ''),
    ('Good News for the Shepherds', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.', 6, 'Luke 2:8-20', 'Curriculum', 'Year A', 'Term 4', '', ''),
    ('Jesus Presented at the Temple', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.', 7, 'Luke 2:22-35', 'Curriculum', 'Year A', 'Term 4', '', ''),
    ('Jesus Brings New Life', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.', 8, 'John 3:1-17', 'Curriculum', 'Year A', 'Term 4', '', ''),
    ('Jesus the Good Shepherd', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.', 9, 'John 10:11-18', 'Curriculum', 'Year A', 'Term 4', '', ''),
    ('The Lamb of God', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium.', 10, 'John 1:29-34', 'Curriculum', 'Year A', 'Term 4', '', ''),
    ('Adam and Christ Compared', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et harum quidem rerum facilis est et expedita distinctio.', 11, 'Romans 5:12-17', 'Curriculum', 'Year A', 'Term 4', '', ''),
    ('Grace Reigns Through Jesus', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.', 12, 'Romans 5:18-21', 'Curriculum', 'Year A', 'Term 4', '', ''),
    ('Saved by God''s Love', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.', 13, 'John 3:16-18', 'Curriculum', 'Year A', 'Term 4', '', ''),
    ('Trust and Follow Jesus', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores.', 14, 'Luke 9:23-26', 'Curriculum', 'Year A', 'Term 4', '', '')
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
