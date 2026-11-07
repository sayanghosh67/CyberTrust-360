import asyncio
import ipaddress
import dns.resolver
import dns.exception
from backend.app.schemas.scan import DNSAnalysis


async def resolve_dns(hostname: str) -> DNSAnalysis:
    """Performs non-blocking DNS query resolution for a target hostname across record types."""
    return await asyncio.to_thread(_sync_resolve_dns, hostname)


def _sync_resolve_dns(hostname: str) -> DNSAnalysis:
    try:
        ip = ipaddress.ip_address(hostname)
        return DNSAnalysis(status="resolved", a_records=[str(ip)] if ip.version == 4 else [], aaaa_records=[str(ip)] if ip.version == 6 else [])
    except ValueError:
        pass
    resolver = dns.resolver.Resolver()
    resolver.timeout = 3.0
    resolver.lifetime = 4.0

    a_records = []
    aaaa_records = []
    mx_records = []
    txt_records = []
    ns_records = []
    error_msg = None

    try:
        # A Records (IPv4)
        try:
            answers = resolver.resolve(hostname, "A")
            a_records = [r.to_text() for r in answers]
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            pass

        # AAAA Records (IPv6)
        try:
            answers = resolver.resolve(hostname, "AAAA")
            aaaa_records = [r.to_text() for r in answers]
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            pass

        # MX Records
        try:
            answers = resolver.resolve(hostname, "MX")
            mx_records = [r.to_text() for r in answers]
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            pass

        # TXT Records
        try:
            answers = resolver.resolve(hostname, "TXT")
            txt_records = [r.to_text().strip('"') for r in answers]
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            pass

        # NS Records (Query root domain if hostname is a subdomain)
        try:
            answers = resolver.resolve(hostname, "NS")
            ns_records = [r.to_text().rstrip(".") for r in answers]
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            pass

        if not a_records and not aaaa_records:
            return DNSAnalysis(
                status="failed",
                error_message=f"DNS lookup returned no A or AAAA records for '{hostname}'. Domain may be unregistered or inactive.",
            )

        return DNSAnalysis(
            status="resolved",
            a_records=a_records,
            aaaa_records=aaaa_records,
            mx_records=mx_records,
            txt_records=txt_records,
            ns_records=ns_records,
            error_message=None,
        )

    except dns.resolver.NXDOMAIN:
        return DNSAnalysis(
            status="failed",
            error_message=f"Domain '{hostname}' does not exist (NXDOMAIN).",
        )
    except dns.exception.Timeout:
        return DNSAnalysis(
            status="unavailable",
            error_message=f"DNS resolution query timed out for '{hostname}'.",
        )
    except Exception as exc:
        return DNSAnalysis(
            status="unavailable",
            error_message="DNS resolver unavailable",
        )
