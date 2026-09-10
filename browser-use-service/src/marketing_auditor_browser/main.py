import argparse
import asyncio
import ipaddress
import json
import os
from pathlib import Path
import socket
from urllib.parse import urlparse

# Browser Use creates its config/profile directories during import. Keep that
# state inside this isolated companion instead of a developer's home directory.
os.environ.setdefault(
    "BROWSER_USE_CONFIG_DIR",
    str(Path(__file__).resolve().parents[2] / ".browser-use"),
)
os.environ.setdefault("ANONYMIZED_TELEMETRY", "false")

from browser_use import Agent, Browser, ChatOpenAI, Tools
from dotenv import load_dotenv
from pydantic import BaseModel, Field


class ObservedLink(BaseModel):
    text: str
    href: str | None = None


class HomepageObservation(BaseModel):
    page_title: str
    primary_cta: ObservedLink | None = None
    navigation_links: list[ObservedLink] = Field(default_factory=list)
    pricing_link: ObservedLink | None = None
    signup_or_free_trial_link: ObservedLink | None = None


EXCLUDED_ACTIONS = [
    "search",
    "go_back",
    "click",
    "input",
    "upload_file",
    "scroll",
    "find_text",
    "send_keys",
    "evaluate",
    "switch",
    "close",
    "dropdown_options",
    "select_dropdown",
    "write_file",
    "read_file",
    "replace_file",
]


def normalize_url(value: str) -> str:
    candidate = value.strip()
    if not candidate.startswith(("http://", "https://")):
        candidate = f"https://{candidate}"

    parsed = urlparse(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Provide a valid HTTP or HTTPS company URL.")
    if parsed.username or parsed.password:
        raise ValueError("URLs containing credentials are not supported.")
    return candidate


def assert_public_hostname(hostname: str) -> None:
    if hostname.lower() == "localhost":
        raise ValueError("Local and private network targets are not allowed.")

    try:
        addresses = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
    except socket.gaierror as error:
        raise ValueError(f"Could not resolve {hostname}.") from error

    if not addresses:
        raise ValueError(f"Could not resolve {hostname}.")

    for address in {item[4][0].split("%")[0] for item in addresses}:
        if not ipaddress.ip_address(address).is_global:
            raise ValueError("Local, private, and reserved network targets are not allowed.")


async def inspect_homepage(raw_url: str) -> HomepageObservation:
    url = normalize_url(raw_url)
    hostname = urlparse(url).hostname
    if not hostname:
        raise ValueError("The URL must contain a hostname.")
    assert_public_hostname(hostname)

    browser = Browser(
        headless=True,
        allowed_domains=[hostname],
        accept_downloads=False,
        auto_download_pdfs=False,
        permissions=[],
    )
    tools = Tools(exclude_actions=EXCLUDED_ACTIONS)
    llm = ChatOpenAI(model=os.getenv("BROWSER_USE_MODEL", "gpt-5-mini"))

    agent = Agent(
        task=f"""
Open only {url}. Observe the loaded public homepage without interacting with it.
Use extraction only. Do not click, type, submit forms, upload or download files,
create an account, sign in, make a purchase, or navigate away from the supplied domain.
Return the page title, primary CTA, visible navigation links, pricing link, and any
signup or free-trial link. A missing item must be null or an empty list.
""".strip(),
        llm=llm,
        browser=browser,
        tools=tools,
        output_model_schema=HomepageObservation,
        use_vision=False,
        max_actions_per_step=1,
    )

    try:
        history = await agent.run(max_steps=5)
        if history.structured_output is None:
            raise RuntimeError("Browser Use did not return structured output.")
        return HomepageObservation.model_validate(history.structured_output)
    finally:
        await browser.stop()


def cli() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(description="Run a guarded Browser Use homepage inspection.")
    parser.add_argument("url", help="Public company URL to inspect")
    args = parser.parse_args()

    result = asyncio.run(inspect_homepage(args.url))
    print(json.dumps(result.model_dump(mode="json"), indent=2))


if __name__ == "__main__":
    cli()
