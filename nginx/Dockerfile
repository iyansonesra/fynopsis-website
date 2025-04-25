FROM nginx:bookworm

# Remove any existing config files
RUN rm /etc/nginx/conf.d/*

# copy your SSL certs
RUN mkdir -p /etc/nginx/certs
COPY ./origin.crt /etc/nginx/certs/origin.crt
COPY ./origin.key /etc/nginx/certs/origin.key

# Copy config files
# *.conf files in "conf.d/" dir get included in main config
COPY ./default.conf /etc/nginx/conf.d/

# Expose the listening port
EXPOSE 80 443

# Launch NGINX
CMD [ "nginx", "-g", "daemon off;" ]