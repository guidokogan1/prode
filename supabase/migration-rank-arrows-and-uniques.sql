begin;

delete from match_markets a
using match_markets b
where a.match_id = b.match_id
  and a.id <> b.id
  and (
    (select count(*) from tickets t where t.match_market_id = a.id)
    < (select count(*) from tickets t where t.match_market_id = b.id)
    or (
      (select count(*) from tickets t where t.match_market_id = a.id)
      = (select count(*) from tickets t where t.match_market_id = b.id)
      and a.id > b.id
    )
  );

alter table match_markets
  add constraint match_markets_match_id_key unique (match_id);

delete from leaderboard_snapshots a
using leaderboard_snapshots b
where a.user_id = b.user_id
  and a.id <> b.id
  and a.as_of < b.as_of;

alter table leaderboard_snapshots
  add column if not exists previous_rank_position int;

alter table leaderboard_snapshots
  add constraint leaderboard_snapshots_user_id_key unique (user_id);

commit;
