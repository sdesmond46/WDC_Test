import BaseHTTPServer, SimpleHTTPServer
import ssl

httpd = BaseHTTPServer.HTTPServer(('localhost', 4443), SimpleHTTPServer.SimpleHTTPRequestHandler)
httpd.socket = ssl.wrap_socket (httpd.socket, certfile='C:\Users\sdesmond\Desktop\gui730_0-10010496\NW_7.0_Presentation_\PRES1\GUI\WINDOWS\WIN32\SapGui\etc\certs\AddTrustExternalCARoot.pem', server_side=True)
httpd.serve_forever()