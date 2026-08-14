PRAGMA foreign_keys = ON;

CREATE TABLE stratum (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL
) WITHOUT ROWID;

CREATE TABLE category (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  stratum     TEXT NOT NULL REFERENCES stratum(id),
  color_hex   TEXT NOT NULL,
  grad_from   TEXT NOT NULL,
  grad_to     TEXT NOT NULL,
  sort        INTEGER NOT NULL
);

CREATE TABLE track (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  subtitle      TEXT NOT NULL,
  description   TEXT NOT NULL,
  category      TEXT NOT NULL REFERENCES category(id),
  status        TEXT NOT NULL CHECK (status IN ('written', 'indexed', 'planned')),
  color_hex     TEXT NOT NULL,
  grad_from     TEXT NOT NULL,
  grad_to       TEXT NOT NULL,
  sort          INTEGER NOT NULL,
  ref_config    TEXT,
  ref_resources TEXT
);

CREATE INDEX track_by_category ON track (category, sort);

CREATE TABLE track_feature (
  track       TEXT NOT NULL REFERENCES track(id),
  sort        INTEGER NOT NULL,
  icon        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  PRIMARY KEY (track, sort)
) WITHOUT ROWID;

CREATE TABLE track_chip (
  track TEXT NOT NULL REFERENCES track(id),
  sort  INTEGER NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  PRIMARY KEY (track, sort)
) WITHOUT ROWID;

CREATE TABLE level (
  track       TEXT NOT NULL REFERENCES track(id),
  idx         INTEGER NOT NULL,
  name        TEXT NOT NULL,
  subtitle    TEXT NOT NULL,
  description TEXT NOT NULL,
  color       TEXT,
  color_hex   TEXT,
  digit       TEXT,
  PRIMARY KEY (track, idx)
) WITHOUT ROWID;

CREATE TABLE tag (
  track TEXT NOT NULL,
  idx   INTEGER NOT NULL,
  tag   TEXT NOT NULL,
  PRIMARY KEY (track, idx, tag),
  FOREIGN KEY (track, idx) REFERENCES level(track, idx)
) WITHOUT ROWID;

CREATE TABLE lesson (
  id          INTEGER PRIMARY KEY,
  path        TEXT NOT NULL UNIQUE,
  track       TEXT NOT NULL REFERENCES track(id),
  level       INTEGER NOT NULL,
  sort        INTEGER NOT NULL,
  position    TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  minutes     INTEGER NOT NULL DEFAULT 0,
  search      TEXT NOT NULL,
  FOREIGN KEY (track, level) REFERENCES level(track, idx)
);

CREATE INDEX lesson_by_level ON lesson (track, level, sort);

CREATE TABLE teaches (
  concept TEXT NOT NULL REFERENCES track(id),
  track   TEXT NOT NULL,
  level   INTEGER NOT NULL,
  weight  INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (concept, track, level),
  FOREIGN KEY (track, level) REFERENCES level(track, idx)
) WITHOUT ROWID;

CREATE INDEX teaches_reverse ON teaches (track, level);

CREATE TABLE unlocks (
  source TEXT NOT NULL REFERENCES track(id),
  target TEXT NOT NULL REFERENCES track(id),
  PRIMARY KEY (source, target)
) WITHOUT ROWID;

CREATE INDEX unlocks_reverse ON unlocks (target);

CREATE TABLE cheatsheet (
  track       TEXT PRIMARY KEY REFERENCES track(id),
  meta        TEXT NOT NULL,
  description TEXT NOT NULL,
  placeholder TEXT NOT NULL
) WITHOUT ROWID;

CREATE TABLE cheatsheet_category (
  track TEXT NOT NULL REFERENCES cheatsheet(track),
  sort  INTEGER NOT NULL,
  name  TEXT NOT NULL,
  icon  TEXT NOT NULL,
  PRIMARY KEY (track, sort)
) WITHOUT ROWID;

CREATE TABLE cheatsheet_item (
  track    TEXT NOT NULL,
  category INTEGER NOT NULL,
  sort     INTEGER NOT NULL,
  keys     TEXT NOT NULL,
  action   TEXT NOT NULL,
  PRIMARY KEY (track, category, sort),
  FOREIGN KEY (track, category) REFERENCES cheatsheet_category(track, sort)
) WITHOUT ROWID;
