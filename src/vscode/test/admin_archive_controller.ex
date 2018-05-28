defmodule TtpWeb.AdminArchiveController do
  use TtpWeb, :controller
  alias Ttp.Opportunities
  alias Ttp.Opportunities.Archive

  plug :authenticate

  use FunctionDecorating, mix_envs: [:dev, :prod]
  decorate_fn_with(Ttp.CallsDecorator)

  defp authenticate(conn, _params) do
    if conn.assigns.is_authenticated do
      conn
    else
      conn
      |> redirect(to: page_path(conn, :message, conn.params["locale"], title: gettext("generic_error"), text: gettext("generic_must_login")))
      |> halt()
    end
  end

  def index(conn, _params) do
    archives = Opportunities.get_archives()
    archives_alphabetically = Enum.sort_by(archives, fn(archive) -> Map.get(archive, String.to_existing_atom("name_#{conn.params["locale"]}")) end)

    render(conn, "index.html", archives: archives_alphabetically)
  end

  def new(conn, _params) do
    changeset = Opportunities.change_archive(%Archive{})
    origin = admin_archive_path(conn, :index, conn.params["locale"])

    render(conn, "new.html", changeset: changeset, origin: origin)
  end

  def create(conn, %{"archive" => archive_params}) do
    %{"origin" => origin} = archive_params

    case Opportunities.create_archive(archive_params) do
      {:ok, _archive} ->
        conn
        |> put_flash(:info, gettext("generic_item_created_successfully"))
        |> redirect(to: origin)
      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "new.html", changeset: changeset, origin: origin)
    end
  end

  def edit(conn, %{"id" => id} = params) do
    archive = Opportunities.get_archive!(id)
    changeset = Opportunities.change_archive(archive)

    origin = case params do
      %{"origin" => origin} -> origin
      _ -> admin_archive_path(conn, :index, conn.params["locale"])
    end

    render(conn, "edit.html", archive: archive, changeset: changeset, origin: origin)
  end

  def update(conn, %{"id" => id, "archive" => archive_params}) do
    archive = Opportunities.get_archive!(id)
    %{"origin" => origin} = archive_params

    case Opportunities.update_archive(archive, archive_params) do
      {:ok, _archive} ->
        conn
        |> put_flash(:info, gettext("generic_item_updated_successfully"))
        |> redirect(to: origin)
      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "edit.html", archive: archive, changeset: changeset, origin: origin)
    end
  end

  def delete(conn, %{"id" => id}) do
    archive = Opportunities.get_archive!(id)
    {:ok, _archive} = Opportunities.delete_archive(archive)

    conn
    |> put_flash(:info, gettext("generic_item_deleted_successfully"))
    |> redirect(to: admin_archive_path(conn, :index, conn.params["locale"]))
  end
end
