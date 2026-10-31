// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

describe("Button", () => {
  it("renderiza variantes, tamanhos e asChild", () => {
    render(
      <>
        <Button>Padrão</Button>
        <Button variant="destructive" size="sm">
          Perigo
        </Button>
        <Button variant="outline" size="lg">
          Contorno
        </Button>
        <Button variant="secondary">Secundário</Button>
        <Button variant="ghost">Fantasma</Button>
        <Button variant="link">Link</Button>
        <Button asChild>
          <a href="#destino">Âncora</a>
        </Button>
      </>
    );

    expect(screen.getByRole("button", { name: "Padrão" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Perigo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Contorno" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Secundário" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fantasma" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Âncora" })).toHaveAttribute(
      "href",
      "#destino"
    );
  });
});

describe("Card", () => {
  it("renderiza todas as partes", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Título</CardTitle>
          <CardDescription>Descrição</CardDescription>
        </CardHeader>
        <CardContent>Conteúdo</CardContent>
        <CardFooter>Rodapé</CardFooter>
      </Card>
    );

    expect(screen.getByText("Título")).toBeInTheDocument();
    expect(screen.getByText("Descrição")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
    expect(screen.getByText("Rodapé")).toBeInTheDocument();
  });
});

describe("Formulário simples", () => {
  it("renderiza label, input e textarea acessíveis", () => {
    render(
      <>
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" placeholder="Digite" />
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" placeholder="Detalhe" />
      </>
    );

    expect(screen.getByLabelText("Nome")).toHaveAttribute("placeholder", "Digite");
    expect(screen.getByLabelText("Descrição")).toHaveAttribute(
      "placeholder",
      "Detalhe"
    );
  });
});

describe("Separator e Progress", () => {
  it("renderiza separadores horizontal e vertical", () => {
    render(
      <>
        <Separator />
        <Separator orientation="vertical" />
      </>
    );

    const separators = screen.getAllByRole("separator");
    expect(separators).toHaveLength(2);
    expect(separators[0]).toHaveAttribute("aria-orientation", "horizontal");
    expect(separators[1]).toHaveAttribute("aria-orientation", "vertical");
  });

  it("expõe o valor do progresso", () => {
    render(<Progress value={40} />);

    const progress = screen.getByRole("progressbar");
    const indicator = progress.firstElementChild as HTMLElement;
    expect(indicator).toHaveStyle({ transform: "translateX(-60%)" });
  });
});

describe("Table", () => {
  it("renderiza estrutura completa", () => {
    render(
      <Table>
        <TableCaption>Legenda</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Ano</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Catan</TableCell>
            <TableCell>1995</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>1</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );

    expect(screen.getByText("Legenda")).toBeInTheDocument();
    expect(screen.getByText("Nome")).toBeInTheDocument();
    expect(screen.getByText("Catan")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });
});

describe("Tabs", () => {
  it("troca o conteúdo ao selecionar aba", () => {
    render(
      <Tabs defaultValue="um">
        <TabsList>
          <TabsTrigger value="um">Um</TabsTrigger>
          <TabsTrigger value="dois">Dois</TabsTrigger>
        </TabsList>
        <TabsContent value="um">Conteúdo um</TabsContent>
        <TabsContent value="dois">Conteúdo dois</TabsContent>
      </Tabs>
    );

    expect(screen.getByText("Conteúdo um")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Dois" }));

    expect(screen.getByText("Conteúdo dois")).toBeInTheDocument();
  });
});

describe("Avatar", () => {
  it("mostra fallback", () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.png" alt="Avatar" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );

    expect(screen.getByText("AB")).toBeInTheDocument();
  });
});

describe("ScrollArea", () => {
  it("renderiza conteúdo e barras", () => {
    render(
      <ScrollArea className="h-24 w-48">
        <div>Conteúdo rolável</div>
        <ScrollBar orientation="vertical" />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );

    expect(screen.getByText("Conteúdo rolável")).toBeInTheDocument();
  });
});

describe("Slider", () => {
  it("responde ao teclado", () => {
    const onValueChange = vi.fn();
    render(
      <Slider defaultValue={[50]} min={0} max={100} onValueChange={onValueChange} />
    );

    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });

    expect(onValueChange).toHaveBeenCalled();
    expect(onValueChange.mock.calls[0][0]).toEqual([51]);
  });
});

describe("Select", () => {
  it("renderiza conteúdo aberto e seleciona item", async () => {
    const onValueChange = vi.fn();
    render(
      <Select defaultOpen onValueChange={onValueChange}>
        <SelectTrigger aria-label="escolha" error>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Grupo</SelectLabel>
            <SelectItem value="a">Opção A</SelectItem>
            <SelectItem value="b">Opção B</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectItem value="c">Opção C</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(await screen.findByText("Opção A")).toBeInTheDocument();
    expect(screen.getByText("Grupo")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Opção A"));
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith("a"));
  });
});

describe("Tooltip", () => {
  it("renderiza conteúdo aberto", async () => {
    render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>Passar mouse</TooltipTrigger>
          <TooltipContent>Dica</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    expect(await screen.findByText("Dica")).toBeInTheDocument();
  });
});

describe("DropdownMenu", () => {
  it("renderiza itens, atalho, checkbox e radio", async () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Rótulo</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              Editar
              <DropdownMenuShortcut>Ctrl+E</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuCheckboxItem checked>Mostrar</DropdownMenuCheckboxItem>
            <DropdownMenuRadioGroup value="r">
              <DropdownMenuRadioItem value="r">Radio</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
        </DropdownMenuContent>
      </DropdownMenu>
    );

    expect(await screen.findByText("Editar")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+E")).toBeInTheDocument();
    expect(screen.getByText("Mostrar")).toBeInTheDocument();
    expect(screen.getByText("Radio")).toBeInTheDocument();
  });
});
