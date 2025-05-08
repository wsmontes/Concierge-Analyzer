@app.route('/status', methods=['GET'])
def status():
    """Health check endpoint to verify server is running"""
    return jsonify({
        "status": "ok",
        "version": "1.1.2",
        "timestamp": datetime.now().isoformat()
    })
