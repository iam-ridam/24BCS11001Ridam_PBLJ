package com.zeroburn.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.*;

@RestController
@RequestMapping("/api/system")
public class SystemController {

    private static final Logger log = LoggerFactory.getLogger(SystemController.class);

    @GetMapping("/network-info")
    public ResponseEntity<Map<String, Object>> getNetworkInfo() {
        List<String> lanIps = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                if (iface.isLoopback() || !iface.isUp() || iface.isVirtual()) continue;
                Enumeration<InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (addr instanceof Inet4Address && !addr.isLoopbackAddress() && !addr.isLinkLocalAddress()) {
                        String ip = addr.getHostAddress();
                        if (!lanIps.contains(ip)) {
                            lanIps.add(ip);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to enumerate network interfaces: {}", e.getMessage());
        }

        String primaryLanIp = !lanIps.isEmpty() ? lanIps.get(0) : "127.0.0.1";

        // Check if a cloudflared tunnel is active
        String tunnelUrl = null;
        try {
            java.io.File tunnelLog = new java.io.File("/home/ridam/Documents/pbls/tunnel.log");
            if (tunnelLog.exists()) {
                String content = java.nio.file.Files.readString(tunnelLog.toPath());
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("https://[a-zA-Z0-9.-]+\\.trycloudflare\\.com").matcher(content);
                while (m.find()) {
                    tunnelUrl = m.group();
                }
            }
        } catch (Exception ignored) {}

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("lanIp", primaryLanIp);
        response.put("tunnelUrl", tunnelUrl);
        response.put("availableIps", lanIps);
        response.put("frontendPort", 5173);
        response.put("backendPort", 8080);

        return ResponseEntity.ok(response);
    }
}
