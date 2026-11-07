// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { GameForm } from "@/components/admin/game-form";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  deleteGameFiles: vi.fn(),
  fetch: vi.fn(),
  createObjectURL: vi.fn(() => "blob:preview"),
  revokeObjectURL: vi.fn(),
}));

vi.mock("@/components/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/app/actions/files", () => ({
  deleteGameFiles: mocks.deleteGameFiles,
}));

function response(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 400,
    json: async () => body,
  } as unknown as Response;
}

const gameData = {
  id: "game-1",
  name: "Catan",
  originalName: "Die Siedler von Catan",
  description: "Descrição",
  year: 1995,
  minPlayers: 3,
  maxPlayers: 4,
  minPlaytime: 60,
  publisher: "Devir",
  designer: "Klaus Teuber",
  artist: "Michael Menzel",
  bggRating: 7.8,
  ludoRating: 8.2,
  bggRank: 200,
  ludoRank: 10,
  weight: 2.3,
  bestPlayers: 4,
  minAge: 10,
  coverImage: "https://example.com/cover.jpg",
  coverImageData: null,
  mechanics: ["Trading"],
  categories: ["Economy"],
  notes: null,
  preparationText: null,
  links: {
    bgg: "https://boardgamegeek.com/boardgame/13",
    ludopedia: "https://ludopedia.com.br/jogo/catan",
    manual: "",
  },
  files: [
    {
      id: "f-cover",
      originalName: "cover.png",
      displayName: "cover.png",
      mimeType: "image/png",
      extension: "png",
      size: 10,
      path: "games/game-1/cover.png",
      type: "COVER",
      uploadedAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "f-manual",
      originalName: "manual.pdf",
      displayName: "manual.pdf",
      mimeType: "application/pdf",
      extension: "pdf",
      size: 2048,
      path: "games/game-1/manual.pdf",
      type: "MANUAL",
      uploadedAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "f-audio",
      originalName: "trilha.mp3",
      displayName: "trilha.mp3",
      mimeType: "audio/mpeg",
      extension: "mp3",
      size: 4096,
      path: "games/game-1/trilha.mp3",
      type: "OTHER",
      uploadedAt: "2024-01-01T00:00:00.000Z",
    },
  ],
};

function getFileInput(container: HTMLElement, withAccept: boolean): HTMLInputElement {
  const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  const input = inputs.find((element) =>
    withAccept ? Boolean(element.getAttribute("accept")) : !element.getAttribute("accept")
  );
  if (!input) throw new Error("Input de arquivo não encontrado");
  return input;
}

function selectFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, "files", { value: files, configurable: true });
  fireEvent.change(input);
}

function fillName(container: HTMLElement, value: string) {
  const input = container.querySelector<HTMLInputElement>('input[name="name"]');
  if (!input) throw new Error("Campo nome não encontrado");
  fireEvent.change(input, { target: { value } });
}

function fillRequiredFields(container: HTMLElement) {
  const fields: Array<[string, string]> = [
    ["minPlayers", "1"],
    ["maxPlayers", "4"],
    ["minPlaytime", "30"],
    ["minAge", "10"],
  ];
  for (const [name, value] of fields) {
    const input = container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    if (!input) throw new Error(`Campo ${name} não encontrado`);
    fireEvent.change(input, { target: { value } });
  }
}

function fillBggRatingPair(container: HTMLElement) {
  const rating = container.querySelector<HTMLInputElement>('input[name="bggRating"]');
  const rank = container.querySelector<HTMLInputElement>('input[name="bggRank"]');
  if (!rating || !rank) throw new Error("Campos de nota/ranking do BGG não encontrados");
  fireEvent.change(rating, { target: { value: "8.1" } });
  fireEvent.change(rank, { target: { value: "100" } });
}

function fillLudoRatingPair(container: HTMLElement) {
  const rating = container.querySelector<HTMLInputElement>('input[name="ludoRating"]');
  const rank = container.querySelector<HTMLInputElement>('input[name="ludoRank"]');
  if (!rating || !rank) throw new Error("Campos de nota/ranking da Ludopedia não encontrados");
  fireEvent.change(rating, { target: { value: "8.4" } });
  fireEvent.change(rank, { target: { value: "50" } });
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  Object.defineProperty(URL, "createObjectURL", {
    value: mocks.createObjectURL,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: mocks.revokeObjectURL,
    configurable: true,
    writable: true,
  });
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  void errorSpy;
});

describe("GameForm - novo jogo", () => {
  it("renderiza seções e ações principais", () => {
    render(<GameForm gameId="new" onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByText("Novo Jogo: Criar Registro")).toBeInTheDocument();
    expect(screen.getByText("NOVO")).toBeInTheDocument();
    expect(screen.getByText("Capa do Jogo")).toBeInTheDocument();
    expect(screen.getByText("Preenchimento Rápido / Web Scraping")).toBeInTheDocument();
    expect(screen.getByText("Informações Básicas")).toBeInTheDocument();
    expect(screen.getByText("Arquivos do Jogo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Criar Jogo/ })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Excluir Jogo" })).not.toBeInTheDocument();
  });

  it("inicia novo jogo com todos os campos vazios", () => {
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={vi.fn()} />
    );

    const fieldNames = [
      "name",
      "year",
      "minPlayers",
      "maxPlayers",
      "minPlaytime",
      "bestPlayers",
      "minAge",
      "designer",
      "publisher",
      "artist",
      "description",
      "preparationText",
      "bggRating",
      "ludoRating",
      "bggRank",
      "ludoRank",
      "interaction",
      "luck",
      "downtime",
      "replayability",
    ];

    for (const name of fieldNames) {
      const field = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[name="${name}"]`
      );
      expect(field).toBeInTheDocument();
      expect(field?.value).toBe("");
    }
  });

  it("fecha o formulário", () => {
    const onClose = vi.fn();
    render(<GameForm gameId="new" onClose={onClose} onSaved={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Fechar"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("valida nome obrigatório", async () => {
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={vi.fn()} />
    );
    const form = container.querySelector("form");
    if (!form) throw new Error("Formulário não encontrado");
    form.noValidate = true;

    fireEvent.click(screen.getByRole("button", { name: /Criar Jogo/ }));

    expect(await screen.findAllByText("Campo obrigatório")).not.toHaveLength(0);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("desativa a validação nativa do navegador", () => {
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={vi.fn()} />
    );

    expect(container.querySelector("form")?.noValidate).toBe(true);
    expect(container.querySelector<HTMLInputElement>('input[name="name"]')).not.toHaveAttribute(
      "required"
    );
  });

  it("deixa campos obrigatórios vermelhos até serem corrigidos", async () => {
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={vi.fn()} />
    );
    const form = container.querySelector("form");
    if (!form) throw new Error("Formulário não encontrado");

    const nameInput = container.querySelector<HTMLInputElement>('input[name="name"]')!;
    const minPlayersInput = container.querySelector<HTMLInputElement>('input[name="minPlayers"]')!;
    const minPlaytimeInput = container.querySelector<HTMLInputElement>(
      'input[name="minPlaytime"]'
    )!;
    const minAgeInput = container.querySelector<HTMLInputElement>('input[name="minAge"]')!;

    fireEvent.change(minPlayersInput, { target: { value: "" } });
    fireEvent.change(minPlaytimeInput, { target: { value: "" } });
    fireEvent.change(minAgeInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Criar Jogo/ }));

    expect(await screen.findAllByText("Campo obrigatório")).not.toHaveLength(0);
    expect(nameInput).toHaveClass("border-error");
    expect(minPlayersInput).toHaveClass("border-error");
    expect(minPlaytimeInput).toHaveClass("border-error");
    expect(minAgeInput).toHaveClass("border-error");

    fillName(container, "Catan");
    fireEvent.change(minPlayersInput, { target: { value: "2" } });
    fireEvent.change(minPlaytimeInput, { target: { value: "30" } });
    fireEvent.change(minAgeInput, { target: { value: "10" } });

    await waitFor(() => expect(nameInput).not.toHaveClass("border-error"));
    expect(minPlayersInput).not.toHaveClass("border-error");
    expect(minPlaytimeInput).not.toHaveClass("border-error");
    expect(minAgeInput).not.toHaveClass("border-error");
  });

  it("destaca os quatro campos quando nota e ranking não foram informados", async () => {
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={vi.fn()} />
    );

    fillName(container, "Catan");
    fireEvent.click(screen.getByRole("button", { name: /Criar Jogo/ }));

    expect(
      await screen.findByText("Campo obrigatório: informe nota e ranking do BGG ou da Ludopedia.")
    ).toBeInTheDocument();

    const ratingInputs = [
      'input[name="bggRating"]',
      'input[name="ludoRating"]',
      'input[name="bggRank"]',
      'input[name="ludoRank"]',
    ].map((selector) => container.querySelector<HTMLInputElement>(selector)!);

    ratingInputs.forEach((input) => expect(input).toHaveClass("border-error"));

    fillBggRatingPair(container);

    await waitFor(() =>
      expect(
        screen.queryByText("Campo obrigatório: informe nota e ranking do BGG ou da Ludopedia.")
      ).not.toBeInTheDocument()
    );
    ratingInputs.forEach((input) => expect(input).not.toHaveClass("border-error"));
  });

  it("permite salvar sem informar o campo melhor com", async () => {
    const onSaved = vi.fn();
    mocks.fetch.mockResolvedValue(response({ id: "game-1" }));
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={onSaved} />
    );

    fillName(container, "Catan");
    fillBggRatingPair(container);
    fillRequiredFields(container);
    const bestPlayersInput = container.querySelector<HTMLInputElement>(
      'input[name="bestPlayers"]'
    )!;
    fireEvent.change(bestPlayersInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Criar Jogo/ }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(bestPlayersInput).not.toHaveClass("border-error");
  });

  it("exige ao menos um par de nota e ranking", async () => {
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={vi.fn()} />
    );
    const form = container.querySelector("form");
    if (!form) throw new Error("Formulário não encontrado");
    form.noValidate = true;

    fillName(container, "Catan");
    fireEvent.click(screen.getByRole("button", { name: /Criar Jogo/ }));

    expect(
      await screen.findByText("Campo obrigatório: informe nota e ranking do BGG ou da Ludopedia.")
    ).toBeInTheDocument();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("bloqueia nota sem ranking na mesma fonte", async () => {
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={vi.fn()} />
    );
    const form = container.querySelector("form");
    if (!form) throw new Error("Formulário não encontrado");
    form.noValidate = true;

    fillName(container, "Catan");
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="bggRating"]')!, {
      target: { value: "8.1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Criar Jogo/ }));

    expect(
      await screen.findByText("Campo obrigatório: informe o ranking do BGG para completar o par.")
    ).toBeInTheDocument();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("salva com apenas o par da Ludopedia", async () => {
    const onSaved = vi.fn();
    mocks.fetch.mockResolvedValue(response({ id: "game-1" }));
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={onSaved} />
    );

    fillName(container, "Catan");
    fillLudoRatingPair(container);
    fillRequiredFields(container);
    fireEvent.click(screen.getByRole("button", { name: /Criar Jogo/ }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("cria o jogo e chama onSaved", async () => {
    const onSaved = vi.fn();
    mocks.fetch.mockResolvedValue(response({ id: "game-1" }));
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={onSaved} />
    );

    fillName(container, "Catan");
    fillBggRatingPair(container);
    fillRequiredFields(container);
    fireEvent.change(
      container.querySelector<HTMLTextAreaElement>('textarea[name="preparationText"]')!,
      { target: { value: "Monte o tabuleiro" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /Criar Jogo/ }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));

    const [url, init] = mocks.fetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe("/api/admin/games");
    expect(init.method).toBe("POST");
    expect(body).toMatchObject({ name: "Catan", preparationText: "Monte o tabuleiro" });
    expect(body).not.toHaveProperty("weight");
    expect(body).not.toHaveProperty("bestPlayers");
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sucesso", variant: "success" })
    );
  });

  it("exibe erro ao falhar a criação", async () => {
    const onSaved = vi.fn();
    mocks.fetch.mockResolvedValue(response({ error: "Jogo já cadastrado" }, false));
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={onSaved} />
    );

    fillName(container, "Catan");
    fillBggRatingPair(container);
    fillRequiredFields(container);
    fireEvent.click(screen.getByRole("button", { name: /Criar Jogo/ }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Erro",
          description: "Jogo já cadastrado",
          variant: "destructive",
        })
      )
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("envia arquivos pendentes após criar o jogo", async () => {
    const onSaved = vi.fn();
    mocks.fetch
      .mockResolvedValueOnce(response({ id: "game-1" }))
      .mockResolvedValueOnce(
        response({
          files: [
            {
              id: "file-1",
              originalName: "manual.pdf",
              displayName: "manual.pdf",
              mimeType: "application/pdf",
              extension: "pdf",
              size: 2048,
              path: "games/game-1/manual.pdf",
              type: "OTHER",
            },
          ],
        })
      );
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={onSaved} />
    );

    selectFiles(getFileInput(container, false), [
      new File(["pdf"], "manual.pdf", { type: "application/pdf" }),
      new File(["audio"], "trilha.mp3", { type: "audio/mpeg" }),
    ]);

    expect(screen.getByText("manual.pdf")).toBeInTheDocument();
    expect(screen.getByText("trilha.mp3")).toBeInTheDocument();

    fillName(container, "Catan");
    fillBggRatingPair(container);
    fillRequiredFields(container);
    fireEvent.click(screen.getByRole("button", { name: /Criar Jogo/ }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(mocks.fetch).toHaveBeenNthCalledWith(
      2,
      "/api/admin/upload",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("preenche o formulário a partir do scraping", async () => {
    mocks.fetch.mockResolvedValue(
      response({
        data: {
          name: "Catan Scraped",
          originalName: "",
          description: "Importado",
          year: 1995,
          minPlayers: 3,
          maxPlayers: 4,
          minPlaytime: 60,
          weight: 2.3,
          bggRating: 7.8,
          ludoRating: 8.2,
          bggRank: 200,
          ludoRank: 10,
          bestPlayers: 4,
          minAge: 10,
          coverImage: "https://example.com/scraped.jpg",
          designer: "Klaus",
          artist: "Michael",
          publisher: "Devir",
          mechanics: ["Trading"],
          categories: ["Economy"],
          links: {
            bgg: "https://boardgamegeek.com/boardgame/13",
            ludopedia: "",
          },
        },
      })
    );
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={vi.fn()} />
    );

    fireEvent.change(screen.getByPlaceholderText("Cole URLs/IDs da Ludopedia"), {
      target: { value: "https://ludopedia.com.br/jogo/catan" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Puxar Dados Automaticamente/ }));

    const useButton = await screen.findByRole("button", { name: "Usar" });
    expect(screen.getByText("Catan Scraped")).toBeInTheDocument();
    fireEvent.click(useButton);

    expect(container.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe(
      "Catan Scraped"
    );
    expect(screen.getByAltText("Capa do jogo")).toHaveAttribute(
      "src",
      "https://example.com/scraped.jpg"
    );
  });

  it("não apaga o nome quando o BGG não retorna dados", async () => {
    mocks.fetch.mockResolvedValue(
      response({
        data: { mechanics: [], categories: [] },
        sources: { ludopedia: "failed", bgg: "failed" },
        errors: { bgg: "BGG_API_TOKEN não está configurado no servidor." },
      })
    );
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={vi.fn()} />
    );

    fillName(container, "Meu Jogo");
    fireEvent.change(screen.getByPlaceholderText("Cole URLs/IDs do BGG"), {
      target: { value: "https://boardgamegeek.com/boardgame/13" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Puxar Dados Automaticamente/ }));

    expect(
      await screen.findByText("BGG_API_TOKEN não está configurado no servidor.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Usar" })).not.toBeInTheDocument();
    expect(container.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe(
      "Meu Jogo"
    );
  });

  it("aplica nota e ranking do BGG ao usar os dados", async () => {
    mocks.fetch.mockResolvedValue(
      response({
        data: {
          name: "Catan",
          originalName: "Catan",
          description: "Descrição BGG",
          bggRating: 7.8,
          bggRank: 200,
          mechanics: [],
          categories: [],
          links: { bgg: "https://boardgamegeek.com/boardgame/13" },
        },
        sources: { ludopedia: "failed", bgg: "success" },
      })
    );
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={vi.fn()} />
    );

    fireEvent.change(screen.getByPlaceholderText("Cole URLs/IDs do BGG"), {
      target: { value: "https://boardgamegeek.com/boardgame/13" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Puxar Dados Automaticamente/ }));

    fireEvent.click(await screen.findByRole("button", { name: "Usar" }));

    expect(container.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe(
      "Catan"
    );
    expect(container.querySelector<HTMLInputElement>('input[name="bggRating"]')?.value).toBe(
      "7.8"
    );
    expect(container.querySelector<HTMLInputElement>('input[name="bggRank"]')?.value).toBe(
      "200"
    );
  });

  it("exibe erro do scraping no cartão de resultado", async () => {
    mocks.fetch.mockResolvedValue(response({ error: "URL inválida" }, false));
    render(<GameForm gameId="new" onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Cole URLs/IDs do BGG"), {
      target: { value: "https://boardgamegeek.com/boardgame/invalido" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Puxar Dados Automaticamente/ }));

    expect(await screen.findByText("URL inválida")).toBeInTheDocument();
  });

  it("atualiza o rótulo de complexidade", () => {
    const { container } = render(
      <GameForm gameId="new" onClose={vi.fn()} onSaved={vi.fn()} />
    );

    const slider = container.querySelector<HTMLInputElement>('input[type="range"]');
    if (!slider) throw new Error("Slider não encontrado");
    fireEvent.change(slider, { target: { value: "4.5" } });

    expect(screen.getByText(/4\.50/)).toBeInTheDocument();
  });
});

describe("GameForm - edição", () => {
  it("carrega dados, arquivos e áudio do jogo", async () => {
    mocks.fetch.mockResolvedValueOnce(response(gameData));
    const { container } = render(
      <GameForm gameId="game-1" onClose={vi.fn()} onSaved={vi.fn()} />
    );

    expect(await screen.findByText("Editando Jogo")).toBeInTheDocument();
    expect(container.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe(
      "Catan"
    );
    expect(screen.getByAltText("Capa do jogo")).toBeInTheDocument();
    expect(screen.getByText("manual.pdf")).toBeInTheDocument();
    expect(screen.getByText("trilha.mp3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar Alterações/ })).toBeDisabled();
  });

  it("carrega o texto de preparo do jogo", async () => {
    mocks.fetch.mockResolvedValueOnce(
      response({ ...gameData, preparationText: "Monte o tabuleiro" })
    );
    const { container } = render(
      <GameForm gameId="game-1" onClose={vi.fn()} onSaved={vi.fn()} />
    );

    expect(await screen.findByText("Editando Jogo")).toBeInTheDocument();
    expect(
      container.querySelector<HTMLTextAreaElement>('textarea[name="preparationText"]')?.value
    ).toBe("Monte o tabuleiro");
  });

  it("avisa quando o carregamento falha", async () => {
    mocks.fetch.mockRejectedValue(new Error("network"));
    render(<GameForm gameId="game-1" onClose={vi.fn()} onSaved={vi.fn()} />);

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Erro",
          description: "Não foi possível carregar os dados do jogo para edição",
          variant: "destructive",
        })
      )
    );
  });

  it("salva alterações e remove arquivos marcados", async () => {
    const onSaved = vi.fn();
    mocks.fetch
      .mockResolvedValueOnce(response(gameData))
      .mockResolvedValueOnce(response({ id: "game-1" }));
    const { container } = render(
      <GameForm gameId="game-1" onClose={vi.fn()} onSaved={onSaved} />
    );

    await screen.findByText("Editando Jogo");
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="name"]')!, {
      target: { value: "Catan Novo" },
    });

    const removeButton = screen.getAllByRole("button", { name: "Remover" })[0];
    fireEvent.click(removeButton);

    fireEvent.click(screen.getByRole("button", { name: /Salvar Alterações/ }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(mocks.deleteGameFiles).toHaveBeenCalledWith(["f-manual"]);
    expect(mocks.fetch).toHaveBeenNthCalledWith(
      2,
      "/api/admin/games/game-1",
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("salva a edição mesmo quando o toast de sucesso falha", async () => {
    const onSaved = vi.fn();
    mocks.fetch
      .mockResolvedValueOnce(response(gameData))
      .mockResolvedValueOnce(response({ id: "game-1" }));
    mocks.toast.mockImplementationOnce(() => {
      throw new Error("toast indisponível");
    });
    const { container } = render(
      <GameForm gameId="game-1" onClose={vi.fn()} onSaved={onSaved} />
    );

    await screen.findByText("Editando Jogo");
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="name"]')!, {
      target: { value: "Catan Novo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Salvar Alterações/ }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it("exclui o jogo após confirmação", async () => {
    const onDeleted = vi.fn();
    mocks.fetch
      .mockResolvedValueOnce(response(gameData))
      .mockResolvedValueOnce(response({ success: true }));
    render(
      <GameForm
        gameId="game-1"
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onDeleted={onDeleted}
      />
    );

    await screen.findByText("Editando Jogo");
    fireEvent.click(screen.getByRole("button", { name: "Excluir Jogo" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Excluir Definitivamente/ })
    );

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(mocks.fetch).toHaveBeenNthCalledWith(
      2,
      "/api/admin/games/game-1",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
