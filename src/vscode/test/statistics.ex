defmodule Ttp.Statistics do
  import Ecto.Query, warn: false

  alias Ttp.Repo
  alias Ttp.Ui.LogEntry

  def get_access_statistics_grouped_by_page() do
    query = from l in LogEntry,
      where: l.type == 1,
      where: not like(l.location, "United States%"),
      where: l.location != "Private",
      group_by: l.description,
      select: {l.description, count(l.id)},
      order_by: l.description
    Repo.all(query)
  end

  def get_access_statistics_grouped_by_location() do
    query = from l in LogEntry,
      where: l.type == 1,
      where: not like(l.location, "United States%"),
      where: l.location != "Private",
      group_by: l.location,
      select: {l.location, count(l.id)},
      order_by: l.location
    Repo.all(query)
  end

  def get_errors() do
    query = from l in LogEntry,
      where: l.type == 2,
      order_by: l.inserted_at
    Repo.all(query)
  end

  def clear() do
    query = from l in LogEntry
    Repo.delete_all(query)
  end
end
